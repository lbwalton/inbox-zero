import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { withAuth } from "@/utils/middleware";
import { publishToQstash } from "@/utils/upstash";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("api/emails/signal");

const emailSignalSchema = z.object({
  threadId: z.string(),
  senderEmail: z.string().email(),
  signal: z.enum(["IMPORTANT", "NOT_IMPORTANT"]),
  emailAccountId: z.string(),
});

export type EmailSignalBody = z.infer<typeof emailSignalSchema>;

export const POST = withAuth(async (request) => {
  const userId = request.auth.userId;
  const json = await request.json();
  const body = emailSignalSchema.parse(json);

  // Verify the email account belongs to the authenticated user
  const emailAccount = await prisma.emailAccount.findFirst({
    where: { id: body.emailAccountId, userId },
    select: { id: true },
  });

  if (!emailAccount) {
    return NextResponse.json(
      { error: "Email account not found", isKnownError: true },
      { status: 400 },
    );
  }

  // Upsert EmailSignal record (replaces existing signal for same threadId)
  await prisma.emailSignal.upsert({
    where: {
      emailAccountId_threadId: {
        emailAccountId: body.emailAccountId,
        threadId: body.threadId,
      },
    },
    create: {
      emailAccountId: body.emailAccountId,
      threadId: body.threadId,
      senderEmail: body.senderEmail,
      signal: body.signal,
      taggedAt: new Date(),
    },
    update: {
      senderEmail: body.senderEmail,
      signal: body.signal,
      taggedAt: new Date(),
    },
  });

  logger.info("Email signal saved", {
    emailAccountId: body.emailAccountId,
    threadId: body.threadId,
    signal: body.signal,
  });

  // Dispatch calculateContactScores via QStash
  await publishToQstash("/api/onboarding/calculate-contact-scores", {
    emailAccountId: body.emailAccountId,
  });

  logger.info("Dispatched calculateContactScores", {
    emailAccountId: body.emailAccountId,
  });

  return NextResponse.json({ saved: true });
});
