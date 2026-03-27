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
 * Calculates and upserts priority scores for every contact associated with
 * the given emailAccountId, weighted by EmailSignal tags.
 *
 * Scoring formula (0-100):
 *   base = replyRate * 35 + invertedReplyTime * 25 + threadFrequency * 25
 *   signal adjustment: +5 per IMPORTANT tag (max +15), -10 per NOT_IMPORTANT tag (floor 0)
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

  // 3. Compute thread frequency normalization.
  //    We use the count of email signals per contact as a proxy for thread frequency.
  //    Alternatively, we derive it from reply rate and reply time presence.
  //    Thread frequency = number of signal entries per contact (proxy for interaction volume).
  //    For contacts without signals we count them as having 1 interaction.
  //
  //    To normalize, we need the max thread count across all contacts.
  const threadCountMap = new Map<string, number>();
  for (const s of signals) {
    const key = s.senderEmail.toLowerCase();
    threadCountMap.set(key, (threadCountMap.get(key) ?? 0) + 1);
  }

  // Also consider contacts with existing scores but no signals
  for (const score of existingScores) {
    const key = score.contactEmail.toLowerCase();
    if (!threadCountMap.has(key)) {
      threadCountMap.set(key, 0);
    }
  }

  const maxThreadCount = Math.max(1, ...threadCountMap.values());

  // 4. Calculate and upsert scores
  const upsertPromises = existingScores.map((contact) => {
    const contactKey = contact.contactEmail.toLowerCase();

    // Reply rate component (0-100 scale already since replyRate is 0-1)
    const replyRateComponent = contact.replyRate * 100 * REPLY_RATE_WEIGHT;

    // Inverted reply time component: faster replies = higher score
    const clampedReplyTime = Math.min(
      contact.avgReplyTimeHours,
      MAX_REPLY_TIME_HOURS,
    );
    const invertedReplyTime = 1 - clampedReplyTime / MAX_REPLY_TIME_HOURS;
    const replyTimeComponent = invertedReplyTime * 100 * REPLY_TIME_WEIGHT;

    // Thread frequency component: normalized 0-1 against the most active contact
    const threadCount = threadCountMap.get(contactKey) ?? 0;
    const normalizedFrequency = threadCount / maxThreadCount;
    const threadFrequencyComponent =
      normalizedFrequency * 100 * THREAD_FREQUENCY_WEIGHT;

    // Base score (max theoretical = 35 + 25 + 25 = 85)
    let score =
      replyRateComponent + replyTimeComponent + threadFrequencyComponent;

    // Signal adjustments
    const signalData = signalMap.get(contactKey);
    if (signalData) {
      const importantBonus = Math.min(
        signalData.importantCount * IMPORTANT_BONUS,
        IMPORTANT_MAX_BONUS,
      );
      const notImportantPenalty =
        signalData.notImportantCount * NOT_IMPORTANT_PENALTY;
      score = score + importantBonus - notImportantPenalty;
    }

    // Clamp to 0-100
    const finalScore = Math.max(0, Math.min(100, score));

    logger.info("Computed contact score", {
      contactEmail: contact.contactEmail,
      replyRateComponent,
      replyTimeComponent,
      threadFrequencyComponent,
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
