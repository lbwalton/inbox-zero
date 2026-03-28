import { env } from "@/env";
import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("notify-slack");

interface SlackNotifyParams {
  userId: string;
  accountLabel: string;
  nudgeType: string;
  sender: string;
  subject: string;
  date: string;
  link: string;
}

/**
 * Send a Slack notification for a nudge alert.
 * Only sends if the user has slackEnabled = true and a webhook URL is configured.
 */
export async function notifySlack(params: SlackNotifyParams): Promise<void> {
  const { userId, accountLabel, nudgeType, sender, subject, date, link } =
    params;

  // Check user settings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { slackEnabled: true, slackWebhookUrl: true },
  });

  if (!user?.slackEnabled) {
    logger.info("Slack notifications disabled for user", { userId });
    return;
  }

  // Use per-user webhook URL first, fall back to global env
  const webhookUrl = user.slackWebhookUrl || env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.warn("No Slack webhook URL configured", { userId });
    return;
  }

  // SSRF protection: only allow Slack webhook URLs
  if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
    logger.error("Invalid Slack webhook URL rejected (SSRF protection)", {
      userId,
    });
    return;
  }

  const typeEmoji = nudgeType === "OUTBOUND" ? "\u{1F4E4}" : "\u{1F4E5}";
  const typeLabel = nudgeType === "OUTBOUND" ? "Outbound" : "Inbound";

  const payload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${typeEmoji} ${typeLabel} Nudge — ${accountLabel}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*From:*\n${sender}` },
          { type: "mrkdwn", text: `*Subject:*\n${subject}` },
          { type: "mrkdwn", text: `*Date:*\n${date}` },
          { type: "mrkdwn", text: `*Account:*\n${accountLabel}` },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open in Bntly", emoji: true },
            url: link,
            style: "primary",
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.error("Slack webhook returned error", {
        status: response.status,
        userId,
      });
    } else {
      logger.info("Slack notification sent", { userId, nudgeType });
    }
  } catch (error) {
    logger.error("Failed to send Slack notification", { userId, error });
  }
}
