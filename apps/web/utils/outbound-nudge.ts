import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("outbound-nudge");

/**
 * Scans sent mail for trigger phrases that indicate the sender is expecting
 * a reply. If no reply has been received after the user's configured
 * outboundNudgeDays, and no NudgeLog for the same threadId exists within the
 * last 24 hours, a NudgeLog of type OUTBOUND is created.
 */
export async function detectOutboundNudges(
  emailAccountId: string,
): Promise<void> {
  logger.info("Starting outbound nudge detection", { emailAccountId });

  // Look up the email account and the user's outboundNudgeDays preference
  const emailAccount = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
    select: {
      id: true,
      email: true,
      userId: true,
      user: {
        select: { outboundNudgeDays: true },
      },
    },
  });

  if (!emailAccount) {
    logger.warn("Email account not found", { emailAccountId });
    return;
  }

  const nudgeDays = emailAccount.user.outboundNudgeDays;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - nudgeDays);

  // Find sent messages (via ThreadTracker or executedRules) that are older
  // than the nudge window. We look at threads where the user sent the last
  // message and no reply has been received.
  const sentThreads = await prisma.threadTracker.findMany({
    where: {
      emailAccountId,
      sentAt: { lte: cutoffDate },
      resolved: false,
    },
    select: {
      threadId: true,
      messageId: true,
    },
  });

  if (sentThreads.length === 0) {
    logger.info("No stale outbound threads found", { emailAccountId });
    return;
  }

  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  let nudgesCreated = 0;

  for (const thread of sentThreads) {
    // Check for existing NudgeLog within last 24 hours for this thread
    const existingNudge = await prisma.nudgeLog.findFirst({
      where: {
        emailAccountId,
        threadId: thread.threadId,
        nudgeType: "OUTBOUND",
        sentAt: { gte: twentyFourHoursAgo },
      },
    });

    if (existingNudge) continue;

    // Create NudgeLog entry
    await prisma.nudgeLog.create({
      data: {
        emailAccountId,
        threadId: thread.threadId,
        nudgeType: "OUTBOUND",
      },
    });

    nudgesCreated++;
  }

  logger.info("Outbound nudge detection complete", {
    emailAccountId,
    threadsScanned: sentThreads.length,
    nudgesCreated,
  });
}
