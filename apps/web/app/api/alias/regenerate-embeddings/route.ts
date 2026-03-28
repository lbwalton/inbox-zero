import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { withAuth } from "@/utils/middleware";
import { generateContactEmbeddings } from "@/utils/contact-embedder";
import { checkRateLimit } from "@/utils/rate-limit";

const regenerateSchema = z.object({
  emailAccountId: z.string().min(1),
});

/**
 * POST /api/alias/regenerate-embeddings — trigger embedding regeneration
 */
export const POST = withAuth(async (request) => {
  const userId = request.auth.userId;

  // Rate limit: 5 requests per hour per user (expensive embedding generation)
  const rateLimited = checkRateLimit(
    `regen-embeddings:${userId}`,
    5,
    60 * 60 * 1000,
  );
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const parsed = regenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { emailAccountId } = parsed.data;

  // Verify the email account belongs to this user
  const account = await prisma.emailAccount.findFirst({
    where: { id: emailAccountId, userId },
    select: { id: true },
  });

  if (!account) {
    return NextResponse.json(
      { error: "Email account not found", isKnownError: true },
      { status: 400 },
    );
  }

  await generateContactEmbeddings(emailAccountId);

  return NextResponse.json({ success: true });
});
