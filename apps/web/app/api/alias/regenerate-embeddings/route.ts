import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { withAuth } from "@/utils/middleware";
import { generateContactEmbeddings } from "@/utils/contact-embedder";

const regenerateSchema = z.object({
  emailAccountId: z.string().min(1),
});

/**
 * POST /api/alias/regenerate-embeddings — trigger embedding regeneration
 */
export const POST = withAuth(async (request) => {
  const userId = request.auth.userId;
  const body = await request.json();
  const { emailAccountId } = regenerateSchema.parse(body);

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
