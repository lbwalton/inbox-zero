import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";
import type { EmailSignalType } from "@prisma/client";

const logger = createScopedLogger("priority-suggest");

const MIN_SIGNALS_FOR_SUGGESTIONS = 5;

/**
 * Analyzes a user's priority patterns and suggests new emails for priority placement.
 * Uses sender patterns from existing IMPORTANT signals + ContactScore data.
 *
 * @returns Array of suggested threadIds with confidence scores
 */
export async function suggestPriorityEmails({
  emailAccountId,
  threadIds,
  senderEmails,
}: {
  emailAccountId: string;
  threadIds: string[];
  senderEmails: Map<string, string>; // threadId -> senderEmail
}): Promise<
  {
    threadId: string;
    senderEmail: string;
    confidence: number;
    reason: string;
  }[]
> {
  // Check if user has enough signals to generate suggestions
  const signalCount = await prisma.emailSignal.count({
    where: { emailAccountId, signal: "IMPORTANT" },
  });

  if (signalCount < MIN_SIGNALS_FOR_SUGGESTIONS) {
    logger.info("Not enough signals for suggestions", {
      emailAccountId,
      signalCount,
      required: MIN_SIGNALS_FOR_SUGGESTIONS,
    });
    return [];
  }

  // Get existing signals to exclude already-processed threads
  const existingSignals = await prisma.emailSignal.findMany({
    where: {
      emailAccountId,
      threadId: { in: threadIds },
    },
    select: { threadId: true, signal: true },
  });

  const existingSignalMap = new Map<string, EmailSignalType>(
    existingSignals.map((s) => [s.threadId, s.signal]),
  );

  // Get important sender patterns
  const importantSignals = await prisma.emailSignal.findMany({
    where: { emailAccountId, signal: "IMPORTANT" },
    select: { senderEmail: true, priorityContext: true },
  });

  const importantSenders = new Set(
    importantSignals.map((s) => s.senderEmail.toLowerCase()),
  );

  // Get high-priority contacts
  const highPriorityContacts = await prisma.contactScore.findMany({
    where: {
      emailAccountId,
      priorityScore: { gte: 70 },
    },
    select: { contactEmail: true, priorityScore: true },
  });

  const contactScoreMap = new Map(
    highPriorityContacts.map((c) => [
      c.contactEmail.toLowerCase(),
      c.priorityScore,
    ]),
  );

  // Score each thread
  const suggestions: {
    threadId: string;
    senderEmail: string;
    confidence: number;
    reason: string;
  }[] = [];

  for (const threadId of threadIds) {
    // Skip threads that already have a signal
    const existingSignal = existingSignalMap.get(threadId);
    if (
      existingSignal === "IMPORTANT" ||
      existingSignal === "NOT_IMPORTANT" ||
      existingSignal === "DISMISSED_SUGGESTION"
    ) {
      continue;
    }

    const sender = senderEmails.get(threadId)?.toLowerCase();
    if (!sender) continue;

    let confidence = 0;
    const reasons: string[] = [];

    // Check if sender is in important senders list
    if (importantSenders.has(sender)) {
      confidence += 0.6;
      reasons.push("Sender previously marked important");
    }

    // Check contact priority score
    const contactScore = contactScoreMap.get(sender);
    if (contactScore && contactScore >= 70) {
      confidence += (contactScore / 100) * 0.4;
      reasons.push(`High contact score (${Math.round(contactScore)})`);
    }

    // Check sender domain match with important senders
    const senderDomain = sender.split("@")[1];
    const importantDomains = new Set(
      [...importantSenders].map((e) => e.split("@")[1]),
    );
    if (
      senderDomain &&
      importantDomains.has(senderDomain) &&
      confidence < 0.3
    ) {
      confidence += 0.2;
      reasons.push("Same domain as important contacts");
    }

    // Only suggest if confidence is above threshold
    if (confidence >= 0.4) {
      suggestions.push({
        threadId,
        senderEmail: sender,
        confidence,
        reason: reasons.join("; "),
      });
    }
  }

  // Sort by confidence descending
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions.slice(0, 10);
}

/**
 * Accept a priority suggestion — promotes to full IMPORTANT signal.
 */
export async function acceptPrioritySuggestion({
  emailAccountId,
  threadId,
  senderEmail,
}: {
  emailAccountId: string;
  threadId: string;
  senderEmail: string;
}) {
  return prisma.emailSignal.upsert({
    where: {
      emailAccountId_threadId: { emailAccountId, threadId },
    },
    create: {
      emailAccountId,
      threadId,
      senderEmail,
      signal: "IMPORTANT",
      priorityContext: "Accepted AI suggestion",
    },
    update: {
      signal: "IMPORTANT",
      priorityContext: "Accepted AI suggestion",
    },
  });
}

/**
 * Dismiss a priority suggestion — tracks dismissal to avoid repeat suggestions.
 */
export async function dismissPrioritySuggestion({
  emailAccountId,
  threadId,
  senderEmail,
}: {
  emailAccountId: string;
  threadId: string;
  senderEmail: string;
}) {
  return prisma.emailSignal.upsert({
    where: {
      emailAccountId_threadId: { emailAccountId, threadId },
    },
    create: {
      emailAccountId,
      threadId,
      senderEmail,
      signal: "DISMISSED_SUGGESTION",
    },
    update: {
      signal: "DISMISSED_SUGGESTION",
    },
  });
}
