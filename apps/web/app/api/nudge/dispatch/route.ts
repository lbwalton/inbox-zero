import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withError } from "@/utils/middleware";
import { env } from "@/env";
import { hasCronSecret, getCronSecretHeader } from "@/utils/cron";
import { publishToQstashQueue } from "@/utils/upstash";
import { dispatchNudges } from "@/utils/nudge-dispatcher";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("cron/nudge/dispatch");

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/nudge/dispatch
 *
 * Two modes, distinguished by the request body:
 * - Fan-out (no body / no userId): enumerate users with pending nudges and
 *   QStash-publish one worker call per user back to this route.
 * - Worker ({ userId }): dispatch that user's pending nudges to their
 *   enabled channels via dispatchNudges. Workers never publish, so the
 *   queue cannot amplify itself.
 */
export const POST = withError(async (request) => {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const userId = body?.userId;

  if (userId !== undefined) {
    if (typeof userId !== "string" || userId.length === 0) {
      return NextResponse.json(
        { error: "userId must be a non-empty string" },
        { status: 400 },
      );
    }

    logger.info("Worker: dispatching nudges for user", { userId });
    await dispatchNudges(userId);
    return NextResponse.json({ ok: true, mode: "worker", userId });
  }

  logger.info("Fan-out: dispatching nudge notifications for all users");

  // Get all distinct user IDs that have pending nudges
  const usersWithPendingNudges = await prisma.nudgeLog.findMany({
    where: { status: "PENDING" },
    select: {
      emailAccount: {
        select: { userId: true },
      },
    },
    distinct: ["emailAccountId"],
  });

  const userIds = [
    ...new Set(usersWithPendingNudges.map((n) => n.emailAccount.userId)),
  ];

  logger.info("Found users with pending nudges", { count: userIds.length });

  const baseUrl = env.NEXT_PUBLIC_BASE_URL;
  const headers = getCronSecretHeader();

  let published = 0;
  for (const id of userIds) {
    try {
      await publishToQstashQueue({
        queueName: "nudge-dispatch",
        parallelism: 3,
        url: `${baseUrl}/api/nudge/dispatch`,
        body: { userId: id },
        headers,
      });

      published++;
      logger.info("Published nudge dispatch for user", { userId: id });
    } catch (error) {
      logger.error("Failed to publish nudge dispatch for user", {
        userId: id,
        error,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    mode: "fan-out",
    published,
    failed: userIds.length - published,
  });
});
