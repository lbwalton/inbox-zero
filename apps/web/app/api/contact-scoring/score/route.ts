import { NextResponse } from "next/server";
import { withError } from "@/utils/middleware";
import { hasCronSecret } from "@/utils/cron";
import { captureException } from "@/utils/error";
import { createScopedLogger } from "@/utils/logger";
import { calculateContactScores } from "@/utils/contact-scoring";

const logger = createScopedLogger("contact-scoring/score");

export const maxDuration = 60;

export const POST = withError(async (request) => {
  if (!hasCronSecret(request)) {
    logger.error("Unauthorized cron request");
    captureException(
      new Error("Unauthorized cron request: contact-scoring/score"),
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

  logger.info("Scoring contacts for account", { emailAccountId });

  try {
    await calculateContactScores(emailAccountId);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error scoring contacts", { emailAccountId, error });
    captureException(error);
    return NextResponse.json(
      { success: false, error: "Error scoring contacts" },
      { status: 500 },
    );
  }
});
