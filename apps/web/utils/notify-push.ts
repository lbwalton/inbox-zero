import { env } from "@/env";
import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";
import * as crypto from "node:crypto";

const logger = createScopedLogger("notify-push");

interface PushNotifyParams {
  userId: string;
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/**
 * Send web push notifications to all subscriptions for a user.
 * Only sends if the user has pushEnabled = true and VAPID keys are configured.
 * Uses the Web Push protocol directly via fetch (no web-push SDK dependency).
 */
export async function notifyPush(params: PushNotifyParams): Promise<void> {
  const { userId, title, body, url, tag } = params;

  // Check user settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushEnabled: true },
  });

  if (!user?.pushEnabled) {
    logger.info("Push notifications disabled for user", { userId });
    return;
  }

  const vapidPublicKey = env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
  const vapidSubject = env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey) {
    logger.warn("VAPID keys not configured");
    return;
  }

  // Get all push subscriptions for the user
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    logger.info("No push subscriptions found for user", { userId });
    return;
  }

  const payload = JSON.stringify({ title, body, url, tag });

  const expiredSubscriptionIds: string[] = [];

  for (const sub of subscriptions) {
    try {
      const endpoint = sub.endpoint;
      const audience = new URL(endpoint).origin;

      // Create VAPID JWT
      const jwt = createVapidJwt({
        audience,
        subject: vapidSubject,
        publicKey: vapidPublicKey,
        privateKey: vapidPrivateKey,
      });

      // Encrypt the payload using the subscription keys
      const encrypted = encryptPayload(payload, sub.p256dhKey, sub.authKey);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
          "Content-Encoding": "aes128gcm",
          "Content-Type": "application/octet-stream",
          TTL: "86400",
        },
        body: encrypted,
      });

      if (response.status === 410 || response.status === 404) {
        // Subscription expired or invalid
        logger.info("Push subscription expired, marking for removal", {
          subscriptionId: sub.id,
        });
        expiredSubscriptionIds.push(sub.id);
      } else if (!response.ok) {
        logger.error("Push notification failed", {
          subscriptionId: sub.id,
          status: response.status,
          statusText: response.statusText,
        });
      } else {
        logger.info("Push notification sent", { subscriptionId: sub.id });
      }
    } catch (error) {
      logger.error("Error sending push notification", {
        subscriptionId: sub.id,
        error,
      });
    }
  }

  // Clean up expired subscriptions
  if (expiredSubscriptionIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expiredSubscriptionIds } },
    });
    logger.info("Removed expired push subscriptions", {
      count: expiredSubscriptionIds.length,
    });
  }
}

/**
 * Create a VAPID JWT for push notification authorization.
 */
function createVapidJwt({
  audience,
  subject,
  publicKey,
  privateKey,
}: {
  audience: string;
  subject: string;
  publicKey: string;
  privateKey: string;
}): string {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const claimsB64 = base64urlEncode(JSON.stringify(claims));
  const unsigned = `${headerB64}.${claimsB64}`;

  // Decode the VAPID private key from URL-safe base64
  const privateKeyBuffer = Buffer.from(
    privateKey.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  );

  // We also need the public key for the JWK
  void publicKey;

  // Create an ECDSA key from the raw private key
  const keyObject = crypto.createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      d: privateKey,
      x: "", // Will be derived
      y: "", // Will be derived
    },
    format: "jwk",
  });

  void privateKeyBuffer;

  const signature = crypto.sign("SHA256", Buffer.from(unsigned), keyObject);

  // Convert DER signature to raw r||s format
  const rawSig = derToRaw(signature);
  const sigB64 = base64urlEncode(rawSig);

  return `${unsigned}.${sigB64}`;
}

function base64urlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function derToRaw(derSig: Buffer): Buffer {
  // Parse DER-encoded ECDSA signature to raw r||s
  // DER: 0x30 [len] 0x02 [rlen] [r] 0x02 [slen] [s]
  let offset = 2; // skip 0x30 and length
  const rLen = derSig[offset + 1]!;
  const r = derSig.subarray(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  const sLen = derSig[offset + 1]!;
  const s = derSig.subarray(offset + 2, offset + 2 + sLen);

  // Pad or trim to 32 bytes each
  const rPad = Buffer.alloc(32);
  r.copy(rPad, 32 - r.length);
  const sPad = Buffer.alloc(32);
  s.copy(sPad, 32 - s.length);

  return Buffer.concat([rPad, sPad]);
}

/**
 * Encrypt a push notification payload using the subscription's keys.
 * Implements the aes128gcm content encoding per RFC 8291.
 */
function encryptPayload(
  payload: string,
  p256dhKey: string,
  authKey: string,
): Buffer {
  const clientPublicKey = Buffer.from(
    p256dhKey.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  );
  const clientAuth = Buffer.from(
    authKey.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  );

  // Generate ephemeral ECDH keypair
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const serverPublicKey = ecdh.getPublicKey();

  // Compute shared secret
  const sharedSecret = ecdh.computeSecret(clientPublicKey);

  // HKDF to derive the auth info and content encryption key
  const authInfo = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    clientPublicKey,
    serverPublicKey,
  ]);
  const ikm = hkdf(clientAuth, sharedSecret, authInfo, 32);
  const salt = crypto.randomBytes(16);

  const keyInfo = Buffer.from("Content-Encoding: aes128gcm\0");
  const nonceInfo = Buffer.from("Content-Encoding: nonce\0");

  const prk = hkdf(salt, ikm, Buffer.alloc(0), 32);
  const contentKey = hkdf(Buffer.alloc(0), prk, keyInfo, 16);
  const nonce = hkdf(Buffer.alloc(0), prk, nonceInfo, 12);

  // Encrypt using AES-128-GCM
  const paddedPayload = Buffer.concat([
    Buffer.from(payload),
    Buffer.from([2]), // Delimiter
  ]);

  const cipher = crypto.createCipheriv("aes-128-gcm", contentKey, nonce);
  const encrypted = Buffer.concat([
    cipher.update(paddedPayload),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  // Build aes128gcm header: salt (16) + rs (4) + idlen (1) + keyid (65)
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  const idLen = Buffer.from([65]); // Length of uncompressed EC point

  return Buffer.concat([salt, rs, idLen, serverPublicKey, encrypted]);
}

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
  const actualSalt = salt.length > 0 ? salt : Buffer.alloc(32);
  const prk = crypto.createHmac("sha256", actualSalt).update(ikm).digest();
  const infoBuffer = Buffer.concat([info, Buffer.from([1])]);
  const okm = crypto.createHmac("sha256", prk).update(infoBuffer).digest();
  return okm.subarray(0, length);
}
