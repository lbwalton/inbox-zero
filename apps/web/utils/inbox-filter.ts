import prisma from "@/utils/prisma";
import { getGmailClientForEmailId } from "@/utils/account";
import { getOrCreateLabel } from "@/utils/gmail/label";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("inbox-filter");

const REVIEW_LABEL_NAME = "Review";
const JUNK_LABEL_NAME = "Junk";

export interface TrustedSenderAction {
  trusted: boolean;
  action: "inbox" | "review" | "junk";
  labelId?: string;
}

/**
 * Filters an inbound email based on trusted sender status and EmailSignal data.
 *
 * - Trusted (in TrustedSender, ContactScore, or has IMPORTANT signal): leave in inbox
 * - NOT_IMPORTANT signal overrides trust: treated as unknown
 * - Unknown: apply "Review" label, remove INBOX label
 * - Spam/cold: apply "Junk" label
 */
export async function filterInboundEmail(
  emailAccountId: string,
  senderEmail: string,
  threadId: string,
): Promise<void> {
  logger.info("Filtering inbound email", {
    emailAccountId,
    senderEmail,
    threadId,
  });

  const normalizedSender = senderEmail.toLowerCase();
  const senderDomain = normalizedSender.split("@")[1];

  // Check for NOT_IMPORTANT signal (overrides trust)
  const notImportantSignal = await prisma.emailSignal.findFirst({
    where: {
      emailAccountId,
      senderEmail: normalizedSender,
      signal: "NOT_IMPORTANT",
    },
  });

  if (notImportantSignal) {
    logger.info("Sender marked NOT_IMPORTANT, treating as unknown", {
      senderEmail,
    });
    await applyReviewLabel(emailAccountId, threadId);
    return;
  }

  // Check if sender is trusted via TrustedSender table
  const trustedSender = await prisma.trustedSender.findFirst({
    where: {
      emailAccountId,
      OR: [
        // Exact contact match (case-insensitive via stored lowercase)
        { type: "CONTACT", value: normalizedSender },
        // Domain match
        ...(senderDomain
          ? [
              {
                type: "TEAM_DOMAIN" as const,
                value: senderDomain,
              },
              {
                type: "CLIENT_DOMAIN" as const,
                value: senderDomain,
              },
            ]
          : []),
      ],
    },
  });

  if (trustedSender) {
    logger.info("Sender is trusted", { senderEmail, type: trustedSender.type });
    return; // Leave in inbox
  }

  // Check if sender has a ContactScore (known contact)
  const contactScore = await prisma.contactScore.findFirst({
    where: {
      emailAccountId,
      contactEmail: normalizedSender,
    },
  });

  if (contactScore) {
    logger.info("Sender has ContactScore, treating as trusted", {
      senderEmail,
    });
    return; // Leave in inbox
  }

  // Check for IMPORTANT signal
  const importantSignal = await prisma.emailSignal.findFirst({
    where: {
      emailAccountId,
      senderEmail: normalizedSender,
      signal: "IMPORTANT",
    },
  });

  if (importantSignal) {
    logger.info("Sender has IMPORTANT signal, treating as trusted", {
      senderEmail,
    });
    return; // Leave in inbox
  }

  // Unknown sender: apply Review label and remove INBOX
  logger.info("Unknown sender, applying Review label", { senderEmail });
  await applyReviewLabel(emailAccountId, threadId);
}

/**
 * Applies the "Review" label to a thread and removes the INBOX label.
 */
async function applyReviewLabel(
  emailAccountId: string,
  threadId: string,
): Promise<void> {
  try {
    const gmail = await getGmailClientForEmailId({ emailAccountId });

    const reviewLabel = await getOrCreateLabel({
      gmail,
      name: REVIEW_LABEL_NAME,
    });

    if (!reviewLabel?.id) {
      logger.error("Failed to get or create Review label", {
        emailAccountId,
      });
      return;
    }

    await gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: {
        addLabelIds: [reviewLabel.id],
        removeLabelIds: ["INBOX"],
      },
    });

    logger.info("Applied Review label to thread", {
      threadId,
      emailAccountId,
    });
  } catch (error) {
    logger.error("Failed to apply Review label", {
      threadId,
      emailAccountId,
      error,
    });
  }
}

/**
 * Applies the "Junk" label to a thread.
 */
export async function applyJunkLabel(
  emailAccountId: string,
  threadId: string,
): Promise<void> {
  try {
    const gmail = await getGmailClientForEmailId({ emailAccountId });

    const junkLabel = await getOrCreateLabel({
      gmail,
      name: JUNK_LABEL_NAME,
    });

    if (!junkLabel?.id) {
      logger.error("Failed to get or create Junk label", { emailAccountId });
      return;
    }

    await gmail.users.threads.modify({
      userId: "me",
      id: threadId,
      requestBody: {
        addLabelIds: [junkLabel.id],
        removeLabelIds: ["INBOX"],
      },
    });

    logger.info("Applied Junk label to thread", { threadId, emailAccountId });
  } catch (error) {
    logger.error("Failed to apply Junk label", {
      threadId,
      emailAccountId,
      error,
    });
  }
}

/**
 * Checks if a sender is trusted for the given email account.
 * Returns the action to take, or null if no matching TrustedSender record.
 */
export async function filterByTrustedSender(
  emailAccountId: string,
  senderEmail: string,
): Promise<TrustedSenderAction | null> {
  const normalizedSender = senderEmail.toLowerCase();
  const senderDomain = normalizedSender.split("@")[1];

  const trustedSender = await prisma.trustedSender.findFirst({
    where: {
      emailAccountId,
      OR: [
        { type: "CONTACT", value: normalizedSender },
        ...(senderDomain
          ? [
              { type: "TEAM_DOMAIN" as const, value: senderDomain },
              { type: "CLIENT_DOMAIN" as const, value: senderDomain },
            ]
          : []),
      ],
    },
  });

  if (!trustedSender) return null;

  return {
    trusted: true,
    action: "inbox",
  };
}
