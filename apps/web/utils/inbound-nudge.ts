import { z } from "zod";
import prisma from "@/utils/prisma";
import { chatCompletionObject } from "@/utils/llms";
import { createScopedLogger } from "@/utils/logger";
import { preprocessBooleanLike } from "@/utils/zod";

const logger = createScopedLogger("inbound-nudge");

const needsReplySchema = z.object({
  expectsReply: z.preprocess(
    preprocessBooleanLike,
    z.boolean().describe("Whether this email expects a reply from the user."),
  ),
});

/**
 * Scans the inbox for unreplied emails older than the user's
 * inboundNudgeDays. Uses an LLM to classify whether the email expects a
 * reply. If yes, and no NudgeLog for the same threadId exists within the
 * last 24 hours, a NudgeLog of type INBOUND is created.
 */
export async function detectInboundNudges(
  emailAccountId: string,
): Promise<void> {
  logger.info("Starting inbound nudge detection", { emailAccountId });

  const emailAccount = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
    select: {
      id: true,
      email: true,
      userId: true,
      about: true,
      user: {
        select: {
          inboundNudgeDays: true,
          aiProvider: true,
          aiModel: true,
          aiApiKey: true,
        },
      },
    },
  });

  if (!emailAccount) {
    logger.warn("Email account not found", { emailAccountId });
    return;
  }

  const nudgeDays = emailAccount.user.inboundNudgeDays;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - nudgeDays);

  // Find inbound emails received before the cutoff that the user has not
  // replied to.  We identify unreplied threads by checking that no sent
  // message exists from the user in the same thread after the inbound message.
  const inboundMessages = await prisma.emailMessage.findMany({
    where: {
      emailAccountId,
      date: { lte: cutoffDate },
      // Only messages FROM someone else (not the user's own email)
      from: { not: emailAccount.email },
      inbox: true,
      read: false,
    },
    select: {
      id: true,
      threadId: true,
      from: true,
      date: true,
    },
    orderBy: { date: "desc" },
    take: 100, // Cap to avoid excessive LLM calls
  });

  if (inboundMessages.length === 0) {
    logger.info("No unreplied inbound messages found", { emailAccountId });
    return;
  }

  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const userAi = {
    aiProvider: emailAccount.user.aiProvider,
    aiModel: emailAccount.user.aiModel,
    aiApiKey: emailAccount.user.aiApiKey,
  };

  let nudgesCreated = 0;

  for (const message of inboundMessages) {
    // Check for existing NudgeLog within last 24 hours
    const existingNudge = await prisma.nudgeLog.findFirst({
      where: {
        emailAccountId,
        threadId: message.threadId,
        nudgeType: "INBOUND",
        sentAt: { gte: twentyFourHoursAgo },
      },
    });

    if (existingNudge) continue;

    // Use LLM to classify whether the email expects a reply.
    // EmailMessage does not store the body, so we pass the sender and date
    // as context.  The LLM makes a best-effort classification.
    try {
      const result = await chatCompletionObject({
        userAi,
        useEconomyModel: true,
        system:
          "You are an email triage assistant. Determine whether the following email likely expects a reply from the recipient based on the sender information.",
        prompt: `From: ${message.from}\nDate: ${message.date.toISOString()}\nThread ID: ${message.threadId}\n\nBased on the sender and context, does this email likely expect a reply? Answer with true or false.`,
        schema: needsReplySchema,
        userEmail: emailAccount.email,
        usageLabel: "inbound-nudge-detection",
      });

      if (!result.object.expectsReply) continue;

      await prisma.nudgeLog.create({
        data: {
          emailAccountId,
          threadId: message.threadId,
          nudgeType: "INBOUND",
        },
      });

      nudgesCreated++;
    } catch (error) {
      logger.error("LLM classification failed for message", {
        messageId: message.id,
        threadId: message.threadId,
        error,
      });
    }
  }

  logger.info("Inbound nudge detection complete", {
    emailAccountId,
    messagesScanned: inboundMessages.length,
    nudgesCreated,
  });
}
