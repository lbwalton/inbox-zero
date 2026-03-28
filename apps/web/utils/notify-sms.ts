import { env } from "@/env";
import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";
import { decryptToken } from "@/utils/encryption";

const logger = createScopedLogger("notify-sms");

interface SmsNotifyParams {
  userId: string;
  accountLabel: string;
  sender: string;
  subject: string;
  link: string;
  isCritical?: boolean;
}

/**
 * Send an SMS notification for a nudge alert via Twilio REST API.
 * Only sends if the user has smsEnabled = true and phone is configured.
 */
export async function notifySms(params: SmsNotifyParams): Promise<void> {
  const { userId, accountLabel, sender, subject, link, isCritical } = params;

  // Check user settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { smsEnabled: true, smsPhoneEncrypted: true },
  });

  if (!user?.smsEnabled) {
    logger.info("SMS notifications disabled for user", { userId });
    return;
  }

  if (!user.smsPhoneEncrypted) {
    logger.warn("No phone number configured for user", { userId });
    return;
  }

  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const fromNumber = env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    logger.warn("Twilio credentials not configured");
    return;
  }

  // Decrypt the phone number
  let toNumber: string | null;
  try {
    toNumber = decryptToken(user.smsPhoneEncrypted);
  } catch (error) {
    logger.error("Failed to decrypt phone number", { userId, error });
    return;
  }

  if (!toNumber) {
    logger.warn("Decrypted phone number is empty", { userId });
    return;
  }

  // Truncate subject to 60 chars
  const truncatedSubject =
    subject.length > 60 ? `${subject.slice(0, 57)}...` : subject;

  const prefix = isCritical ? "CRITICAL: " : "";
  const message = `${prefix}[${accountLabel}] ${sender} is waiting \u2014 ${truncatedSubject}. Open: ${link}`;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const body = new URLSearchParams({
    To: toNumber,
    From: fromNumber,
    Body: message,
  });

  try {
    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Twilio API returned error", {
        status: response.status,
        body: errorBody,
        userId,
      });
    } else {
      logger.info("SMS notification sent", { userId });
    }
  } catch (error) {
    logger.error("Failed to send SMS notification", { userId, error });
  }
}
