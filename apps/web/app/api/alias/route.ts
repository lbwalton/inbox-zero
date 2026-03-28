import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { withAuth } from "@/utils/middleware";

export type GetAliasesResponse = Awaited<ReturnType<typeof getAliases>>;

async function getAliases(userId: string) {
  return prisma.contactAlias.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

const confirmAliasSchema = z.object({
  phrase: z.string().min(1),
  resolvedEmail: z.string().email(),
  resolvedName: z.string().nullable().optional(),
  emailAccountId: z.string().min(1),
});

export type ConfirmAliasBody = z.infer<typeof confirmAliasSchema>;

/**
 * GET /api/alias — list all aliases for the authenticated user
 */
export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;
  const aliases = await getAliases(userId);
  return NextResponse.json(aliases);
});

/**
 * POST /api/alias/confirm — upsert a confirmed alias
 */
export const POST = withAuth(async (request) => {
  const userId = request.auth.userId;
  const body = await request.json();
  const data = confirmAliasSchema.parse(body);

  // Verify the email account belongs to this user
  const account = await prisma.emailAccount.findFirst({
    where: { id: data.emailAccountId, userId },
    select: { id: true },
  });

  if (!account) {
    return NextResponse.json(
      { error: "Email account not found", isKnownError: true },
      { status: 400 },
    );
  }

  const alias = await prisma.contactAlias.upsert({
    where: {
      userId_phrase: {
        userId,
        phrase: data.phrase,
      },
    },
    create: {
      userId,
      phrase: data.phrase,
      resolvedEmail: data.resolvedEmail,
      resolvedName: data.resolvedName ?? null,
      emailAccountId: data.emailAccountId,
      confirmedAt: new Date(),
    },
    update: {
      resolvedEmail: data.resolvedEmail,
      resolvedName: data.resolvedName ?? null,
      emailAccountId: data.emailAccountId,
      confirmedAt: new Date(),
    },
  });

  return NextResponse.json({ saved: true, alias });
});
