import { NextResponse } from "next/server";
import { withError } from "@/utils/middleware";
import { hasCronSecret } from "@/utils/cron";
import { captureException } from "@/utils/error";
import { createScopedLogger } from "@/utils/logger";
import { scanToneProfile } from "@/utils/tone-scanner";

const logger = createScopedLogger("tone-profile/scan/worker");

export const maxDuration = 60;

export const POST = withError(async (request) => {
  if (!hasCronSecret(request)) {
    logger.error("Unauthorized cron request");
    captureException(
      new Error("Unauthorized cron request: tone-profile/scan/worker"),
    );
    return new Response("Unauthorized", { status: 401 });
  }

  const json = await request.json();
  const { emailAccountId } = json;

  if (!emailAccountId || typeof emailAccountId !== "string") {
    return NextResponse.json(
      { error: "emailAccountId is required" },
      { status: 400 },
    );
  }

  logger.info("Scanning tone profile for account", { emailAccountId });

  try {
    await scanToneProfile(emailAccountId);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error scanning tone profile", { emailAccountId, error });
    captureException(error);
    return NextResponse.json(
      { success: false, error: "Error scanning tone profile" },
      { status: 500 },
    );
  }
});
