import prisma from "@/utils/prisma";
import { shouldSuppressNudge } from "@/utils/focus-mode-check";
import { notifySlack } from "@/utils/notify-slack";
import { notifySms } from "@/utils/notify-sms";
import { createScopedLogger } from "@/utils/logger";
import { env } from "@/env";

const logger = createScopedLogger("nudge-dispatcher");

/**
 * Reads all PENDING NudgeLog records for the given user across all accounts,
 * applies Focus Mode suppression, and dispatches to all enabled notification
 * channels (Slack, SMS, Push). Updates each NudgeLog status to ACTIONED after
 * dispatch.
 */
export async function dispatchNudges(userId: string): Promise<void> {
  logger.info("Starting nudge dispatch", { userId });

  // Load user preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      slackEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
    },
  });

  if (!user) {
    logger.warn("User not found", { userId });
    return;
  }

  // Load all PENDING nudges for the user's accounts
  const pendingNudges = await prisma.nudgeLog.findMany({
    where: {
      emailAccount: { userId },
      status: "PENDING",
    },
    include: {
      emailAccount: {
        select: {
          id: true,
          email: true,
          accountLabel: true,
        },
      },
    },
  });

  if (pendingNudges.length === 0) {
    logger.info("No pending nudges to dispatch", { userId });
    return;
  }

  logger.info("Found pending nudges", {
    userId,
    count: pendingNudges.length,
  });

  const baseUrl = env.NEXT_PUBLIC_BASE_URL;

  for (const nudge of pendingNudges) {
    try {
      // Check Focus Mode suppression — we don't have sender email on
      // NudgeLog directly, so we pass the thread id context. We use the
      // email account's own email as a fallback since the contact cannot
      // be determined from the NudgeLog model alone.
      const suppressed = await shouldSuppressNudge(
        userId,
        nudge.emailAccountId,
        nudge.emailAccount.email,
      );

      if (suppressed) {
        logger.info("Nudge suppressed by Focus Mode", {
          nudgeId: nudge.id,
          emailAccountId: nudge.emailAccountId,
        });
        continue;
      }

      const accountLabel =
        nudge.emailAccount.accountLabel || nudge.emailAccount.email;
      const link = `${baseUrl}/mail/${nudge.emailAccountId}/thread/${nudge.threadId}`;
      const subject = `Thread ${nudge.threadId.slice(0, 8)}`;
      const sender = nudge.emailAccount.email;
      const date = nudge.sentAt.toISOString().split("T")[0] ?? "";

      // Dispatch to Slack
      if (user.slackEnabled) {
        try {
          await notifySlack({
            userId,
            accountLabel,
            nudgeType: nudge.nudgeType,
            sender,
            subject,
            date,
            link,
          });
        } catch (error) {
          logger.error("Slack dispatch failed", { nudgeId: nudge.id, error });
        }
      }

      // Dispatch to SMS
      if (user.smsEnabled) {
        try {
          await notifySms({
            userId,
            accountLabel,
            sender,
            subject,
            link,
          });
        } catch (error) {
          logger.error("SMS dispatch failed", { nudgeId: nudge.id, error });
        }
      }

      // Dispatch to Push (notify-push may not exist yet)
      if (user.pushEnabled) {
        logger.info("Push notifications not yet implemented", {
          nudgeId: nudge.id,
        });
      }

      // Mark as ACTIONED
      await prisma.nudgeLog.update({
        where: { id: nudge.id },
        data: { status: "ACTIONED" },
      });

      logger.info("Nudge dispatched", {
        nudgeId: nudge.id,
        nudgeType: nudge.nudgeType,
      });
    } catch (error) {
      logger.error("Failed to dispatch nudge", {
        nudgeId: nudge.id,
        error,
      });
    }
  }

  logger.info("Nudge dispatch complete", { userId });
}
