import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withError } from "@/utils/middleware";
import { env } from "@/env";
import { hasCronSecret, getCronSecretHeader } from "@/utils/cron";
import { publishToQstashQueue } from "@/utils/upstash";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("cron/nudge/detect");

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/nudge/detect
 *
 * Daily cron endpoint that dispatches outbound and inbound nudge detection
 * for every EmailAccount via QStash.
 */
export const POST = withError(async (request) => {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("Dispatching nudge detection for all accounts");

  const emailAccounts = await prisma.emailAccount.findMany({
    select: { id: true, email: true },
  });

  logger.info("Found email accounts for nudge detection", {
    count: emailAccounts.length,
  });

  const baseUrl = env.NEXT_PUBLIC_BASE_URL;
  const headers = getCronSecretHeader();

  for (const account of emailAccounts) {
    try {
      // Dispatch outbound nudge detection
      await publishToQstashQueue({
        queueName: "nudge-outbound",
        parallelism: 3,
        url: `${baseUrl}/api/nudge/outbound`,
        body: { emailAccountId: account.id },
        headers,
      });

      // Dispatch inbound nudge detection
      await publishToQstashQueue({
        queueName: "nudge-inbound",
        parallelism: 3,
        url: `${baseUrl}/api/nudge/inbound`,
        body: { emailAccountId: account.id },
        headers,
      });

      logger.info("Dispatched nudge detection", {
        emailAccountId: account.id,
        email: account.email,
      });
    } catch (error) {
      logger.error("Failed to dispatch nudge detection", {
        emailAccountId: account.id,
        error,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    dispatched: emailAccounts.length,
  });
});
