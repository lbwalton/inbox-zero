import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withError } from "@/utils/middleware";
import { env } from "@/env";
import {
  getCronSecretHeader,
  hasCronSecret,
  hasPostCronSecret,
} from "@/utils/cron";
import { captureException } from "@/utils/error";
import { createScopedLogger } from "@/utils/logger";
import { publishToQstashQueue } from "@/utils/upstash";

const logger = createScopedLogger("cron/tone-profile/scan");

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function dispatchToneScans() {
  logger.info("Dispatching tone profile scans for all accounts");

  const emailAccounts = await prisma.emailAccount.findMany({
    select: { id: true, email: true },
  });

  logger.info("Found email accounts for tone scanning", {
    count: emailAccounts.length,
  });

  const url = `${env.NEXT_PUBLIC_BASE_URL}/api/tone-profile/scan/worker`;

  for (const emailAccount of emailAccounts) {
    try {
      await publishToQstashQueue({
        queueName: "tone-profile-scan",
        parallelism: 3,
        url,
        body: { emailAccountId: emailAccount.id },
        headers: getCronSecretHeader(),
      });
    } catch (error) {
      logger.error("Failed to publish tone scan to QStash", {
        email: emailAccount.email,
        error,
      });
    }
  }

  logger.info("All tone scan requests dispatched", {
    count: emailAccounts.length,
  });

  return { queued: true };
}

export const GET = withError(async (request) => {
  if (!hasCronSecret(request)) {
    captureException(new Error("Unauthorized request: api/tone-profile/scan"));
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await dispatchToneScans();

  return NextResponse.json(result);
});

export const POST = withError(async (request) => {
  if (!(await hasPostCronSecret(request))) {
    captureException(
      new Error("Unauthorized cron request: api/tone-profile/scan"),
    );
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await dispatchToneScans();

  return NextResponse.json(result);
});
