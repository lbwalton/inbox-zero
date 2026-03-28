import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { withError, type RequestWithAuth } from "@/utils/middleware";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("push/subscribe");

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * POST /api/push/subscribe
 *
 * Save a PushSubscription for the authenticated user.
 */
export const POST = withError(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const json = await request.json();
  const parsed = subscribeSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid subscription data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { endpoint, keys } = parsed.data;

  logger.info("Saving push subscription", { userId, endpoint });

  // Upsert based on endpoint to avoid duplicates
  await prisma.pushSubscription.upsert({
    where: {
      // Use endpoint as unique identifier — if an existing sub has the same endpoint, update it
      id:
        (
          await prisma.pushSubscription.findFirst({
            where: { userId, endpoint },
            select: { id: true },
          })
        )?.id ?? "new",
    },
    update: {
      p256dhKey: keys.p256dh,
      authKey: keys.auth,
    },
    create: {
      userId,
      endpoint,
      p256dhKey: keys.p256dh,
      authKey: keys.auth,
    },
  });

  return NextResponse.json({ saved: true });
});
