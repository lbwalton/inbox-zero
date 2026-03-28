import prisma from "@/utils/prisma";
import { getGmailClientForEmailId } from "@/utils/account";
import { getOrCreateLabel } from "@/utils/gmail/label";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("junk-purge");

const JUNK_LABEL_NAME = "Junk";

/**
 * Purges emails in the Junk label that are older than the user's
 * junkAutoPurgeDays setting. Only runs if junkAutoPurge is enabled.
 */
export async function purgeJunkEmails(emailAccountId: string): Promise<void> {
  logger.info("Starting junk purge", { emailAccountId });

  const emailAccount = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
    select: {
      id: true,
      email: true,
      userId: true,
      user: {
        select: {
          junkAutoPurge: true,
          junkAutoPurgeDays: true,
        },
      },
    },
  });

  if (!emailAccount) {
    logger.warn("Email account not found", { emailAccountId });
    return;
  }

  if (!emailAccount.user.junkAutoPurge) {
    logger.info("Junk auto-purge disabled for user", {
      emailAccountId,
      userId: emailAccount.userId,
    });
    return;
  }

  const purgeDays = emailAccount.user.junkAutoPurgeDays;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - purgeDays);

  // Format date for Gmail query: YYYY/MM/DD
  const formattedDate = `${cutoffDate.getFullYear()}/${String(cutoffDate.getMonth() + 1).padStart(2, "0")}/${String(cutoffDate.getDate()).padStart(2, "0")}`;

  try {
    const gmail = await getGmailClientForEmailId({ emailAccountId });

    // Get or create the Junk label
    const junkLabel = await getOrCreateLabel({
      gmail,
      name: JUNK_LABEL_NAME,
    });

    if (!junkLabel?.id) {
      logger.warn("Junk label not found or could not be created", {
        emailAccountId,
      });
      return;
    }

    // Query for messages with the Junk label older than the cutoff
    const query = `label:${JUNK_LABEL_NAME} before:${formattedDate}`;

    let pageToken: string | undefined;
    let totalDeleted = 0;

    do {
      const response = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 100,
        pageToken,
      });

      const messages = response.data.messages || [];

      if (messages.length === 0) break;

      // Delete each message (permanent delete via gmail.messages.delete)
      for (const message of messages) {
        if (!message.id) continue;

        try {
          await gmail.users.messages.delete({
            userId: "me",
            id: message.id,
          });
          totalDeleted++;
        } catch (error) {
          logger.error("Failed to delete message", {
            messageId: message.id,
            emailAccountId,
            error,
          });
        }
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    logger.info("Junk purge complete", {
      emailAccountId,
      totalDeleted,
      purgeDays,
    });
  } catch (error) {
    logger.error("Junk purge failed", { emailAccountId, error });
  }
}
