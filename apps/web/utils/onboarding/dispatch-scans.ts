import { publishToQstash } from "@/utils/upstash";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("onboarding");

/**
 * Dispatches onboarding scan jobs for a newly connected email account.
 * Sends both calculateContactScores and scanToneProfile requests via QStash
 * so they run asynchronously in the background.
 */
export async function dispatchOnboardingScans({
  emailAccountId,
}: {
  emailAccountId: string;
}) {
  logger.info("Dispatching onboarding scans", { emailAccountId });

  const body = { emailAccountId };

  const [contactScoresResult, toneProfileResult] = await Promise.allSettled([
    publishToQstash("/api/onboarding/calculate-contact-scores", body),
    publishToQstash("/api/onboarding/scan-tone-profile", body),
  ]);

  if (contactScoresResult.status === "rejected") {
    logger.error("Failed to dispatch calculateContactScores", {
      emailAccountId,
      error: contactScoresResult.reason,
    });
  } else {
    logger.info("Dispatched calculateContactScores", { emailAccountId });
  }

  if (toneProfileResult.status === "rejected") {
    logger.error("Failed to dispatch scanToneProfile", {
      emailAccountId,
      error: toneProfileResult.reason,
    });
  } else {
    logger.info("Dispatched scanToneProfile", { emailAccountId });
  }
}
