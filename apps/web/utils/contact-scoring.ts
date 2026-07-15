import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("contact-scoring");

// Weight constants for base score components
const REPLY_RATE_WEIGHT = 0.35;
const REPLY_TIME_WEIGHT = 0.25;
const THREAD_FREQUENCY_WEIGHT = 0.25;

// Signal adjustments
const IMPORTANT_BONUS = 5;
const IMPORTANT_MAX_BONUS = 15;
const NOT_IMPORTANT_PENALTY = 10;

// Normalization ceiling for reply time (hours).
// Contacts replying faster than this get a higher score component.
const MAX_REPLY_TIME_HOURS = 168; // 7 days

/**
 * Pure scoring formula (0-100):
 *   base = replyRate * 35 + invertedReplyTime * 25 + threadFrequency * 25
 *   signal adjustment: +5 per IMPORTANT tag (max +15), -10 per NOT_IMPORTANT tag
 *   clamped to 0-100
 *
 * threadCount/maxThreadCount come from actual email volume (distinct
 * EmailMessage threads per contact), never from signal counts — a manual
 * importance tag must only move the score through its own bonus/penalty.
 */
export function computeContactScore({
  replyRate,
  avgReplyTimeHours,
  threadCount,
  maxThreadCount,
  importantCount,
  notImportantCount,
}: {
  replyRate: number;
  avgReplyTimeHours: number;
  threadCount: number;
  maxThreadCount: number;
  importantCount: number;
  notImportantCount: number;
}): number {
  // Reply rate component (replyRate is 0-1)
  const replyRateComponent = replyRate * 100 * REPLY_RATE_WEIGHT;

  // Inverted reply time component: faster replies = higher score
  const clampedReplyTime = Math.min(avgReplyTimeHours, MAX_REPLY_TIME_HOURS);
  const invertedReplyTime = 1 - clampedReplyTime / MAX_REPLY_TIME_HOURS;
  const replyTimeComponent = invertedReplyTime * 100 * REPLY_TIME_WEIGHT;

  // Thread frequency component: normalized 0-1 against the most active contact
  const normalizedFrequency = threadCount / Math.max(1, maxThreadCount);
  const threadFrequencyComponent =
    normalizedFrequency * 100 * THREAD_FREQUENCY_WEIGHT;

  let score =
    replyRateComponent + replyTimeComponent + threadFrequencyComponent;

  const importantBonus = Math.min(
    importantCount * IMPORTANT_BONUS,
    IMPORTANT_MAX_BONUS,
  );
  const notImportantPenalty = notImportantCount * NOT_IMPORTANT_PENALTY;
  score = score + importantBonus - notImportantPenalty;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculates and upserts priority scores for every contact associated with
 * the given emailAccountId, weighted by EmailSignal tags.
 *
 * Contacts with manualOverride = true are skipped.
 */
export async function calculateContactScores(
  emailAccountId: string,
): Promise<void> {
  logger.info("Starting contact score calculation", { emailAccountId });

  // 1. Gather all existing ContactScore rows for this account (skip manual overrides)
  const existingScores = await prisma.contactScore.findMany({
    where: { emailAccountId, manualOverride: false },
    select: {
      id: true,
      contactEmail: true,
      replyRate: true,
      avgReplyTimeHours: true,
    },
  });

  if (existingScores.length === 0) {
    logger.info("No non-override contacts found; nothing to score", {
      emailAccountId,
    });
    return;
  }

  // 2. Fetch all EmailSignal records for this account
  const signals = await prisma.emailSignal.findMany({
    where: { emailAccountId },
    select: { senderEmail: true, signal: true },
  });

  // Build a map: contactEmail -> { importantCount, notImportantCount }
  const signalMap = new Map<
    string,
    { importantCount: number; notImportantCount: number }
  >();

  for (const s of signals) {
    const key = s.senderEmail.toLowerCase();
    const entry = signalMap.get(key) ?? {
      importantCount: 0,
      notImportantCount: 0,
    };
    if (s.signal === "IMPORTANT") {
      entry.importantCount++;
    } else if (s.signal === "NOT_IMPORTANT") {
      entry.notImportantCount++;
    }
    signalMap.set(key, entry);
  }

  // 3. Thread frequency from actual email volume: distinct received threads
  //    per contact. One groupBy row per (from, threadId) pair.
  const threadGroups = await prisma.emailMessage.groupBy({
    by: ["from", "threadId"],
    where: { emailAccountId, sent: false },
  });

  const threadCountMap = new Map<string, number>();
  for (const g of threadGroups) {
    const key = g.from.toLowerCase();
    threadCountMap.set(key, (threadCountMap.get(key) ?? 0) + 1);
  }

  const maxThreadCount = Math.max(1, ...threadCountMap.values());

  // 4. Calculate and upsert scores
  const upsertPromises = existingScores.map((contact) => {
    const contactKey = contact.contactEmail.toLowerCase();
    const signalData = signalMap.get(contactKey);

    const finalScore = computeContactScore({
      replyRate: contact.replyRate,
      avgReplyTimeHours: contact.avgReplyTimeHours,
      threadCount: threadCountMap.get(contactKey) ?? 0,
      maxThreadCount,
      importantCount: signalData?.importantCount ?? 0,
      notImportantCount: signalData?.notImportantCount ?? 0,
    });

    logger.info("Computed contact score", {
      contactEmail: contact.contactEmail,
      threadCount: threadCountMap.get(contactKey) ?? 0,
      signalData,
      finalScore,
    });

    return prisma.contactScore.update({
      where: { id: contact.id },
      data: {
        priorityScore: finalScore,
        lastUpdated: new Date(),
      },
    });
  });

  await Promise.all(upsertPromises);

  logger.info("Contact score calculation complete", {
    emailAccountId,
    contactsScored: existingScores.length,
  });
}
