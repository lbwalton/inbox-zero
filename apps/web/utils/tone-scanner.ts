import { z } from "zod";
import prisma from "@/utils/prisma";
import { chatCompletionObject } from "@/utils/llms";
import type { UserAIFields } from "@/utils/llms/types";
import { getGmailClientForEmailId } from "@/utils/account";
import { queryBatchMessagesPages } from "@/utils/gmail/message";
import { createScopedLogger } from "@/utils/logger";
import { truncate } from "@/utils/string";

const logger = createScopedLogger("tone-scanner");

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_SENT_MESSAGES = 200;

const toneProfileSchema = z.object({
  avgSentenceLength: z
    .number()
    .describe(
      "Average number of words per sentence across all analyzed emails",
    ),
  topOpeners: z
    .array(z.string())
    .max(5)
    .describe("Top 5 most common email opening phrases"),
  topSignoffs: z
    .array(z.string())
    .max(5)
    .describe("Top 5 most common email sign-off phrases"),
  formalityScore: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("Formality score from 1 (very casual) to 5 (very formal)"),
  commonPhrases: z
    .array(z.string())
    .max(10)
    .describe("Top 10 most commonly used phrases or expressions"),
});

/**
 * Scans the last 90 days of sent mail for the given email account,
 * extracts a tone profile using the configured LLM, and upserts the
 * result into the ToneProfile table.
 */
export async function scanToneProfile(emailAccountId: string): Promise<void> {
  logger.info("Starting tone profile scan", { emailAccountId });

  // Fetch account with user AI settings
  const emailAccount = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
    select: {
      id: true,
      email: true,
      user: {
        select: {
          aiProvider: true,
          aiModel: true,
          aiApiKey: true,
        },
      },
    },
  });

  if (!emailAccount) {
    logger.error("Email account not found", { emailAccountId });
    throw new Error(`Email account not found: ${emailAccountId}`);
  }

  const userAi: UserAIFields = emailAccount.user;

  // Build Gmail query for sent mail in the last 90 days
  const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS);
  const afterDate = formatDateForGmail(ninetyDaysAgo);
  const query = `in:sent after:${afterDate}`;

  const gmail = await getGmailClientForEmailId({ emailAccountId });

  const sentMessages = await queryBatchMessagesPages(gmail, {
    query,
    maxResults: MAX_SENT_MESSAGES,
  });

  if (sentMessages.length === 0) {
    logger.warn("No sent messages found in the last 90 days", {
      emailAccountId,
    });
    // Upsert a default profile so lastScanned is updated
    await prisma.toneProfile.upsert({
      where: { emailAccountId },
      create: {
        emailAccountId,
        avgSentenceLength: 0,
        commonOpeners: [],
        commonSignoffs: [],
        formalityScore: 3,
        commonPhrases: [],
        lastScanned: new Date(),
      },
      update: {
        lastScanned: new Date(),
      },
    });
    return;
  }

  // Prepare email bodies for the LLM
  const emailBodies = sentMessages
    .map((msg) => {
      const body = msg.textPlain || msg.snippet || "";
      return body.trim();
    })
    .filter((body) => body.length > 0)
    .map((body) => truncate(body, 1500));

  if (emailBodies.length === 0) {
    logger.warn("No email bodies extracted from sent messages", {
      emailAccountId,
    });
    return;
  }

  logger.info("Analyzing tone profile", {
    emailAccountId,
    emailCount: emailBodies.length,
  });

  const system = `You are an expert email writing analyst. Analyze the following collection of sent emails and extract a detailed writing tone profile.

Your analysis must produce:
1. avgSentenceLength: The average number of words per sentence across all emails.
2. topOpeners: The top 5 most commonly used opening lines or greetings (e.g., "Hi", "Hey team", "Good morning"). If fewer than 5 distinct openers exist, return as many as found.
3. topSignoffs: The top 5 most commonly used sign-off phrases (e.g., "Best", "Thanks", "Regards"). If fewer than 5 distinct sign-offs exist, return as many as found.
4. formalityScore: A score from 1 to 5 where 1 is very casual and 5 is very formal.
5. commonPhrases: The top 10 most frequently used phrases or expressions (2-5 words each) that characterize this person's writing style. If fewer than 10 distinct phrases exist, return as many as found.

Be precise and base your analysis only on the provided emails.`;

  const prompt = `Here are the sent emails to analyze:

<emails>
${emailBodies.map((body, i) => `<email index="${i + 1}">\n${body}\n</email>`).join("\n")}
</emails>

Analyze these emails and extract the tone profile.`;

  const result = await chatCompletionObject({
    userAi,
    system,
    prompt,
    schema: toneProfileSchema,
    userEmail: emailAccount.email,
    usageLabel: "Tone Profile Scan",
  });

  const profile = result.object;

  logger.info("Tone profile extracted", {
    emailAccountId,
    avgSentenceLength: profile.avgSentenceLength,
    formalityScore: profile.formalityScore,
    openerCount: profile.topOpeners.length,
    signoffCount: profile.topSignoffs.length,
    phraseCount: profile.commonPhrases.length,
  });

  // Upsert into ToneProfile table
  await prisma.toneProfile.upsert({
    where: { emailAccountId },
    create: {
      emailAccountId,
      avgSentenceLength: profile.avgSentenceLength,
      commonOpeners: profile.topOpeners,
      commonSignoffs: profile.topSignoffs,
      formalityScore: profile.formalityScore,
      commonPhrases: profile.commonPhrases,
      lastScanned: new Date(),
    },
    update: {
      avgSentenceLength: profile.avgSentenceLength,
      commonOpeners: profile.topOpeners,
      commonSignoffs: profile.topSignoffs,
      formalityScore: profile.formalityScore,
      commonPhrases: profile.commonPhrases,
      lastScanned: new Date(),
    },
  });

  logger.info("Tone profile saved", { emailAccountId });
}

/** Formats a Date as YYYY/MM/DD for Gmail search queries. */
function formatDateForGmail(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}
