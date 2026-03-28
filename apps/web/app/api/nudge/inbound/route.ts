import { NextResponse } from "next/server";
import { withError } from "@/utils/middleware";
import { hasCronSecret } from "@/utils/cron";
import { captureException } from "@/utils/error";
import { createScopedLogger } from "@/utils/logger";
import { detectInboundNudges } from "@/utils/inbound-nudge";

const logger = createScopedLogger("nudge/inbound");

export const maxDuration = 60;

export const POST = withError(async (request) => {
  if (!hasCronSecret(request)) {
    captureException(new Error("Unauthorized cron request: nudge/inbound"));
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

  logger.info("Running inbound nudge detection", { emailAccountId });

  try {
    await detectInboundNudges(emailAccountId);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in inbound nudge detection", {
      emailAccountId,
      error,
    });
    captureException(error);
    return NextResponse.json(
      { success: false, error: "Error in inbound nudge detection" },
      { status: 500 },
    );
  }
});
