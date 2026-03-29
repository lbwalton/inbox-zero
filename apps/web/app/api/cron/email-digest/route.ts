import { NextResponse } from "next/server";
import { withError } from "@/utils/middleware";
import { hasCronSecret } from "@/utils/cron";
import prisma from "@/utils/prisma";
import { sendEmailDigest } from "@/utils/notifications/email-digest";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("cron/email-digest");

export const maxDuration = 120;

export const POST = withError(async (request) => {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentHour = new Date().getUTCHours();

  // Find users whose digest hour matches the current UTC hour
  const users = await prisma.user.findMany({
    where: {
      emailDigestEnabled: true,
      emailDigestTimeUtc: currentHour,
    },
    select: {
      id: true,
      email: true,
      emailAccounts: {
        select: {
          id: true,
          email: true,
          accountLabel: true,
        },
      },
    },
  });

  logger.info("Processing email digests", {
    hour: currentHour,
    userCount: users.length,
  });

  let sentCount = 0;
  let errorCount = 0;

  for (const user of users) {
    if (!user.email) continue;

    try {
      const digest = await sendEmailDigest(user);

      if (!digest) continue;

      // Log successful generation (actual sending handled by sendEmailDigest)
      sentCount++;
    } catch (error) {
      logger.error("Failed to send digest", { userId: user.id, error });
      errorCount++;
    }
  }

  return NextResponse.json({ sentCount, errorCount });
});
