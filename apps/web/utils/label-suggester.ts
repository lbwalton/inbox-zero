import { z } from "zod";
import prisma from "@/utils/prisma";
import { chatCompletionObject } from "@/utils/llms";
import type { UserAIFields } from "@/utils/llms/types";
import { getGmailClientForEmailId } from "@/utils/account";
import { queryBatchMessagesPages } from "@/utils/gmail/message";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("label-suggester");

const MAX_RECENT_MESSAGES = 200;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const labelSuggestionSchema = z.object({
  labels: z
    .array(
      z.object({
        name: z.string().describe("A concise label name (1-3 words)"),
        reasoning: z
          .string()
          .describe("Brief explanation of why this label would be useful"),
      }),
    )
    .min(1)
    .max(5)
    .describe("Suggested Gmail labels based on email patterns"),
});

const domainSuggestionSchema = z.object({
  domains: z
    .array(
      z.object({
        domain: z.string().describe("The company domain (e.g. company.com)"),
        reasoning: z
          .string()
          .describe("Why this domain appears to be a trusted client/partner"),
      }),
    )
    .max(10)
    .describe("Frequent company domains that are likely trusted senders"),
});

/**
 * Analyzes recent email patterns for the given email account and:
 * 1. Suggests 3-5 Gmail labels via LLM — creates SuggestedLabel records
 * 2. Detects frequent company domains — creates TrustedSender records
 *    of type CLIENT_DOMAIN with addedManually = false
 *
 * Skips labels that already exist as SuggestedLabel records.
 */
export async function suggestLabels(emailAccountId: string): Promise<void> {
  logger.info("Starting label suggestion", { emailAccountId });

  const emailAccount = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
    select: {
      id: true,
      email: true,
      userId: true,
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
    logger.warn("Email account not found", { emailAccountId });
    return;
  }

  const userAi: UserAIFields = emailAccount.user;

  // Fetch recent emails
  const gmail = await getGmailClientForEmailId({ emailAccountId });
  const cutoffDate = new Date(Date.now() - THIRTY_DAYS_MS);
  const formattedDate = `${cutoffDate.getFullYear()}/${String(cutoffDate.getMonth() + 1).padStart(2, "0")}/${String(cutoffDate.getDate()).padStart(2, "0")}`;

  const messages = await queryBatchMessagesPages(gmail, {
    query: `after:${formattedDate}`,
    maxResults: MAX_RECENT_MESSAGES,
  });

  if (messages.length === 0) {
    logger.info("No recent messages found for label suggestion", {
      emailAccountId,
    });
    return;
  }

  // Build a summary of email patterns for the LLM
  const emailSummaries = messages
    .map((msg) => {
      const from = msg.headers.from || "unknown";
      const subject = msg.headers.subject || "(no subject)";
      return `From: ${from} | Subject: ${subject}`;
    })
    .join("\n");

  // LLM Prompt 1: Suggest labels
  try {
    const existingLabels = await prisma.suggestedLabel.findMany({
      where: { emailAccountId },
      select: { labelName: true },
    });
    const existingLabelNames = new Set(
      existingLabels.map((l) => l.labelName.toLowerCase()),
    );

    const labelResult = await chatCompletionObject({
      userAi,
      useEconomyModel: true,
      prompt: `Analyze these recent emails and suggest 3-5 useful Gmail labels that would help organize this inbox. Do not suggest common labels like "Inbox", "Sent", "Drafts", "Spam", "Trash", "Starred", or "Important". Focus on patterns in the sender domains, subjects, and content types.\n\nRecent emails:\n${emailSummaries}`,
      system:
        "You are an email organization assistant. Suggest concise, actionable Gmail labels based on email patterns. Each label should be 1-3 words.",
      schema: labelSuggestionSchema,
      userEmail: emailAccount.email,
      usageLabel: "label-suggestion",
    });

    const suggestions = labelResult.object.labels.filter(
      (l) => !existingLabelNames.has(l.name.toLowerCase()),
    );

    if (suggestions.length > 0) {
      await prisma.suggestedLabel.createMany({
        data: suggestions.map((s) => ({
          emailAccountId,
          labelName: s.name,
          reasoning: s.reasoning,
          status: "PENDING" as const,
        })),
      });

      logger.info("Created label suggestions", {
        emailAccountId,
        count: suggestions.length,
      });
    }
  } catch (error) {
    logger.error("Failed to generate label suggestions", {
      emailAccountId,
      error,
    });
  }

  // LLM Prompt 2: Detect frequent company domains
  try {
    const existingDomains = await prisma.trustedSender.findMany({
      where: {
        emailAccountId,
        type: "CLIENT_DOMAIN",
      },
      select: { value: true },
    });
    const existingDomainValues = new Set(
      existingDomains.map((d) => d.value.toLowerCase()),
    );

    // Also get the user's own domain to exclude it
    const userDomain = emailAccount.email.split("@")[1]?.toLowerCase();

    const domainResult = await chatCompletionObject({
      userAi,
      useEconomyModel: true,
      prompt: `Analyze these recent emails and identify frequent company domains that appear to be trusted clients, partners, or services this user regularly interacts with. Exclude the user's own domain (${userDomain || "unknown"}) and common services like gmail.com, outlook.com, yahoo.com, etc.\n\nRecent emails:\n${emailSummaries}`,
      system:
        "You are an email analysis assistant. Identify company domains that appear frequently and seem to be trusted business contacts or services.",
      schema: domainSuggestionSchema,
      userEmail: emailAccount.email,
      usageLabel: "domain-suggestion",
    });

    const newDomains = domainResult.object.domains.filter(
      (d) => !existingDomainValues.has(d.domain.toLowerCase()),
    );

    if (newDomains.length > 0) {
      await prisma.trustedSender.createMany({
        data: newDomains.map((d) => ({
          emailAccountId,
          type: "CLIENT_DOMAIN" as const,
          value: d.domain.toLowerCase(),
          addedManually: false,
        })),
      });

      logger.info("Created trusted sender domains", {
        emailAccountId,
        count: newDomains.length,
      });
    }
  } catch (error) {
    logger.error("Failed to detect company domains", {
      emailAccountId,
      error,
    });
  }

  logger.info("Label suggestion complete", { emailAccountId });
}
