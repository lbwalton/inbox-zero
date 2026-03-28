import { NextResponse } from "next/server";
import { withError } from "@/utils/middleware";
import { env } from "@/env";
import { processHistoryForUser } from "@/app/api/google/webhook/process-history";
import { logger } from "@/app/api/google/webhook/logger";
import prisma from "@/utils/prisma";
import { publishToQstash } from "@/utils/upstash";

export const maxDuration = 120;

// Google PubSub calls this endpoint each time a user recieves an email. We subscribe for updates via `api/google/watch`
export const POST = withError(async (request) => {
  const searchParams = new URL(request.url).searchParams;
  const token = searchParams.get("token");
  if (
    env.GOOGLE_PUBSUB_VERIFICATION_TOKEN &&
    token !== env.GOOGLE_PUBSUB_VERIFICATION_TOKEN
  ) {
    logger.error("Invalid verification token");
    return NextResponse.json(
      {
        message: "Invalid verification token",
      },
      { status: 403 },
    );
  }

  const body = await request.json();
  const decodedData = decodeHistoryId(body);

  logger.info("Processing webhook", {
    emailAddress: decodedData.emailAddress,
    historyId: decodedData.historyId,
  });

  // Identify EmailAccount by Gmail address and dispatch Bntly jobs (non-blocking)
  const emailAddress = decodedData.emailAddress.toLowerCase();
  const emailAccount = await prisma.emailAccount.findUnique({
    where: { email: emailAddress },
    select: {
      id: true,
      userId: true,
      user: {
        select: { autoDraftEnabled: true },
      },
    },
  });

  if (emailAccount) {
    const dispatches: Promise<unknown>[] = [];

    // Dispatch auto-draft generation if user has autoDraftEnabled
    if (emailAccount.user.autoDraftEnabled) {
      dispatches.push(
        publishToQstash("/api/google/webhook/auto-draft", {
          emailAccountId: emailAccount.id,
          emailAddress,
        }).catch((err) =>
          logger.error("Failed to dispatch generateAutoDraft", {
            emailAccountId: emailAccount.id,
            error: err,
          }),
        ),
      );
    }

    // Dispatch inbound email filter for every inbound email
    dispatches.push(
      publishToQstash("/api/google/webhook/filter-inbound", {
        emailAccountId: emailAccount.id,
        emailAddress,
      }).catch((err) =>
        logger.error("Failed to dispatch filterInboundEmail", {
          emailAccountId: emailAccount.id,
          error: err,
        }),
      ),
    );

    // Fire-and-forget: do not await — webhook returns 200 immediately
    void Promise.allSettled(dispatches);
  }

  return await processHistoryForUser(decodedData);
});

function decodeHistoryId(body: { message?: { data?: string } }) {
  const data = body?.message?.data;

  if (!data) throw new Error("No data found");

  // data is base64url-encoded JSON
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const decodedData: { emailAddress: string; historyId: number | string } =
    JSON.parse(Buffer.from(base64, "base64").toString());

  // seem to get this in different formats? so unifying as number
  const historyId =
    typeof decodedData.historyId === "string"
      ? Number.parseInt(decodedData.historyId)
      : decodedData.historyId;

  return { emailAddress: decodedData.emailAddress, historyId };
}
