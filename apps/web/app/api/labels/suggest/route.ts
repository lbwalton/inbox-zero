import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withError } from "@/utils/middleware";
import { env } from "@/env";
import { hasCronSecret, getCronSecretHeader } from "@/utils/cron";
import { publishToQstashQueue } from "@/utils/upstash";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("cron/labels/suggest");

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/labels/suggest
 *
 * Monthly cron endpoint that dispatches smart label suggestion
 * for all EmailAccounts via QStash.
 */
export const POST = withError(async (request) => {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("Dispatching label suggestions for all accounts");

  const emailAccounts = await prisma.emailAccount.findMany({
    select: { id: true, email: true },
  });

  logger.info("Found email accounts for label suggestion", {
    count: emailAccounts.length,
  });

  const baseUrl = env.NEXT_PUBLIC_BASE_URL;
  const headers = getCronSecretHeader();

  for (const account of emailAccounts) {
    try {
      await publishToQstashQueue({
        queueName: "label-suggest",
        parallelism: 3,
        url: `${baseUrl}/api/labels/suggest`,
        body: { emailAccountId: account.id },
        headers,
      });

      logger.info("Dispatched label suggestion", {
        emailAccountId: account.id,
        email: account.email,
      });
    } catch (error) {
      logger.error("Failed to dispatch label suggestion", {
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
