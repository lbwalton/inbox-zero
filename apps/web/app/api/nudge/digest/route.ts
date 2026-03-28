import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withError } from "@/utils/middleware";
import { hasCronSecret } from "@/utils/cron";
import { captureException } from "@/utils/error";
import { createScopedLogger } from "@/utils/logger";
import { env } from "@/env";

const logger = createScopedLogger("nudge/digest");

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface NudgeItem {
  threadId: string;
  nudgeType: string;
  sentAt: Date;
  accountLabel: string;
  accountEmail: string;
}

/**
 * POST /api/nudge/digest
 *
 * Daily cron endpoint that sends an email digest of pending nudges to users
 * who have emailDigestEnabled = true.
 */
export const POST = withError(async (request) => {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured, skipping digest");
    return NextResponse.json({ ok: true, skipped: true });
  }

  const resendApiKey = env.RESEND_API_KEY;

  logger.info("Starting nudge digest send");

  // Find all users with email digest enabled
  const users = await prisma.user.findMany({
    where: { emailDigestEnabled: true },
    select: {
      id: true,
      email: true,
      notificationView: true,
      emailAccounts: {
        select: {
          id: true,
          email: true,
          accountLabel: true,
        },
      },
    },
  });

  let sentCount = 0;
  let errorCount = 0;

  for (const user of users) {
    if (!user.email) continue;

    const emailAccountIds = user.emailAccounts.map((ea) => ea.id);
    if (emailAccountIds.length === 0) continue;

    // Fetch pending nudge logs across all accounts
    const pendingNudges = await prisma.nudgeLog.findMany({
      where: {
        emailAccountId: { in: emailAccountIds },
        status: "PENDING",
      },
      orderBy: { sentAt: "desc" },
      select: {
        id: true,
        threadId: true,
        nudgeType: true,
        sentAt: true,
        emailAccountId: true,
      },
    });

    if (pendingNudges.length === 0) continue;

    // Build a lookup for account info
    const accountMap = new Map(
      user.emailAccounts.map((ea) => [
        ea.id,
        { label: ea.accountLabel || ea.email, email: ea.email },
      ]),
    );

    const nudgeItems: NudgeItem[] = pendingNudges.map((nudge) => {
      const account = accountMap.get(nudge.emailAccountId);
      return {
        threadId: nudge.threadId,
        nudgeType: nudge.nudgeType,
        sentAt: nudge.sentAt,
        accountLabel: account?.label || "Unknown",
        accountEmail: account?.email || "",
      };
    });

    // Format the digest based on notificationView
    let htmlBody: string;

    if (user.notificationView === "PER_ACCOUNT") {
      // Group by account
      const grouped = new Map<string, NudgeItem[]>();
      for (const item of nudgeItems) {
        const key = item.accountLabel;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(item);
      }

      const sections = Array.from(grouped.entries())
        .map(([label, items]) => {
          const rows = items
            .map(
              (item) =>
                `<tr>
                  <td style="padding:8px;border-bottom:1px solid #eee;">${item.nudgeType === "OUTBOUND" ? "Outbound" : "Inbound"}</td>
                  <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(item.threadId)}</td>
                  <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(item.sentAt.toLocaleDateString())}</td>
                </tr>`,
            )
            .join("");
          return `<h3 style="color:#C96B16;margin-top:24px;">${escapeHtml(label)}</h3>
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #C96B16;">Type</th>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #C96B16;">Thread</th>
                <th style="text-align:left;padding:8px;border-bottom:2px solid #C96B16;">Date</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>`;
        })
        .join("");

      htmlBody = sections;
    } else {
      // COMBINED view — flat list
      const rows = nudgeItems
        .map(
          (item) =>
            `<tr>
              <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(item.accountLabel)}</td>
              <td style="padding:8px;border-bottom:1px solid #eee;">${item.nudgeType === "OUTBOUND" ? "Outbound" : "Inbound"}</td>
              <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(item.threadId)}</td>
              <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(item.sentAt.toLocaleDateString())}</td>
            </tr>`,
        )
        .join("");

      htmlBody = `<table style="width:100%;border-collapse:collapse;">
        <thead><tr>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #C96B16;">Account</th>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #C96B16;">Type</th>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #C96B16;">Thread</th>
          <th style="text-align:left;padding:8px;border-bottom:2px solid #C96B16;">Date</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    const fullHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#C96B16;">Bntly Daily Nudge Digest</h2>
        <p>You have ${pendingNudges.length} pending nudge${pendingNudges.length === 1 ? "" : "s"} awaiting your attention.</p>
        ${htmlBody}
        <p style="margin-top:24px;color:#888;font-size:12px;">
          <a href="${env.NEXT_PUBLIC_BASE_URL}/settings" style="color:#C96B16;">Manage notification settings</a>
        </p>
      </div>
    `;

    try {
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL,
          to: [user.email],
          subject: `Bntly Digest: ${pendingNudges.length} nudge${pendingNudges.length === 1 ? "" : "s"} need attention`,
          html: fullHtml,
        }),
      });

      if (!resendResponse.ok) {
        const errorBody = await resendResponse.text();
        throw new Error(
          `Resend API error: ${resendResponse.status} ${errorBody}`,
        );
      }
      sentCount++;
      logger.info("Digest email sent", { userId: user.id });
    } catch (error) {
      errorCount++;
      logger.error("Failed to send digest email", {
        userId: user.id,
        error,
      });
      captureException(error);
    }
  }

  logger.info("Nudge digest complete", { sentCount, errorCount });

  return NextResponse.json({
    ok: true,
    sentCount,
    errorCount,
  });
});
