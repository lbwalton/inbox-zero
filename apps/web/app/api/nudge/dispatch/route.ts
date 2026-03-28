import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withError } from "@/utils/middleware";
import { env } from "@/env";
import { hasCronSecret, getCronSecretHeader } from "@/utils/cron";
import { publishToQstashQueue } from "@/utils/upstash";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("cron/nudge/dispatch");

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/nudge/dispatch
 *
 * Triggers the nudge dispatcher for all users via QStash.
 * Each user's pending nudges are dispatched to their enabled channels.
 */
export const POST = withError(async (request) => {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("Dispatching nudge notifications for all users");

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

  for (const userId of userIds) {
    try {
      await publishToQstashQueue({
        queueName: "nudge-dispatch",
        parallelism: 3,
        url: `${baseUrl}/api/nudge/dispatch`,
        body: { userId },
        headers,
      });

      logger.info("Dispatched nudge dispatch for user", { userId });
    } catch (error) {
      logger.error("Failed to dispatch nudge for user", { userId, error });
    }
  }

  return NextResponse.json({
    ok: true,
    dispatched: userIds.length,
  });
});
