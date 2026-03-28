import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("focus-mode-check");

/**
 * Determines whether a nudge notification should be suppressed based on the
 * user's Focus Mode settings.
 *
 * Rules:
 * 1. If FocusMode.isActive = false -> never suppress
 * 2. If scheduleEnabled = true, check whether the current time (in
 *    scheduleTimezone) falls within [scheduleStartHour, scheduleEndHour).
 *    If outside the window -> do not suppress.
 * 3. If the nudge's emailAccountId matches the focusedAccountId -> do not
 *    suppress (user is actively monitoring that account).
 * 4. Otherwise, look up the sender's ContactScore for the nudge account.
 *    If priorityScore < breakthroughThreshold -> suppress.
 */
export async function shouldSuppressNudge(
  userId: string,
  nudgeEmailAccountId: string,
  senderEmail: string,
): Promise<boolean> {
  const focusMode = await prisma.focusMode.findUnique({
    where: { userId },
  });

  // No FocusMode record or not active -> never suppress
  if (!focusMode || !focusMode.isActive) {
    return false;
  }

  // Schedule check: if schedule is enabled, only suppress during the window
  if (focusMode.scheduleEnabled) {
    const timezone = focusMode.scheduleTimezone ?? "UTC";
    const startHour = focusMode.scheduleStartHour;
    const endHour = focusMode.scheduleEndHour;

    if (startHour != null && endHour != null) {
      const currentHour = getCurrentHourInTimezone(timezone);

      // Check if current hour is within the schedule window
      const isInWindow =
        startHour <= endHour
          ? currentHour >= startHour && currentHour < endHour
          : // Wraps past midnight (e.g. 22 -> 6)
            currentHour >= startHour || currentHour < endHour;

      if (!isInWindow) {
        logger.info("Outside focus schedule window, not suppressing", {
          userId,
          currentHour,
          startHour,
          endHour,
          timezone,
        });
        return false;
      }
    }
  }

  // If nudge is for the focused account, do not suppress
  if (
    focusMode.focusedAccountId &&
    nudgeEmailAccountId === focusMode.focusedAccountId
  ) {
    return false;
  }

  // Cross-account nudge: check breakthrough threshold
  const contactScore = await prisma.contactScore.findFirst({
    where: {
      emailAccountId: nudgeEmailAccountId,
      contactEmail: senderEmail.toLowerCase(),
    },
    select: { priorityScore: true },
  });

  const score = contactScore?.priorityScore ?? 0;
  const shouldSuppress = score < focusMode.breakthroughThreshold;

  logger.info("Focus mode suppression decision", {
    userId,
    nudgeEmailAccountId,
    senderEmail,
    score,
    breakthroughThreshold: focusMode.breakthroughThreshold,
    shouldSuppress,
  });

  return shouldSuppress;
}

/**
 * Returns the current hour (0-23) in the given IANA timezone.
 */
function getCurrentHourInTimezone(timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour");
    return Number.parseInt(hourPart?.value ?? "0", 10);
  } catch {
    // If timezone is invalid, fall back to UTC
    return new Date().getUTCHours();
  }
}
