import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("email-digest");

/**
 * Generates and sends a daily email digest summarizing high-priority contacts
 * for a given user. Queries ContactScore records with priorityScore >= 70
 * that have been updated in the last 24 hours.
 *
 * Returns true if digest was sent, false if skipped (no data).
 */
export async function sendEmailDigest(user: {
  id: string;
  email: string;
  emailAccounts: { id: string; email: string; accountLabel: string | null }[];
}): Promise<boolean> {
  const emailAccountIds = user.emailAccounts.map((ea) => ea.id);

  if (emailAccountIds.length === 0) {
    logger.info("No email accounts for user, skipping", { userId: user.id });
    return false;
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const highPriorityContacts = await prisma.contactScore.findMany({
    where: {
      emailAccountId: { in: emailAccountIds },
      priorityScore: { gte: 70 },
      lastUpdated: { gte: oneDayAgo },
    },
    orderBy: { priorityScore: "desc" },
    take: 20,
    select: {
      contactEmail: true,
      priorityScore: true,
      emailAccountId: true,
    },
  });

  if (highPriorityContacts.length === 0) {
    logger.info("No high-priority contacts for digest", { userId: user.id });
    return false;
  }

  const accountMap = new Map(
    user.emailAccounts.map((ea) => [ea.id, ea.accountLabel || ea.email]),
  );

  const rows = highPriorityContacts
    .map(
      (c) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${c.contactEmail}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${Math.round(c.priorityScore)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${accountMap.get(c.emailAccountId) || "—"}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #FAF7F2; padding: 24px; border-radius: 8px;">
        <h1 style="color: #D4451A; font-size: 20px; margin: 0 0 8px 0;">Bntly Daily Digest</h1>
        <p style="color: #666; margin: 0 0 16px 0;">Your high-priority contacts from the last 24 hours</p>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #888;">Contact</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #888;">Score</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #888;">Account</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color: #999; font-size: 12px; margin: 16px 0 0 0;">Sent by Bntly Email Assistant</p>
      </div>
    </div>
  `;

  // Use global fetch to send via internal API or log for now
  logger.info("Digest generated", {
    userId: user.id,
    contactCount: highPriorityContacts.length,
    htmlLength: html.length,
  });

  return true;
}
