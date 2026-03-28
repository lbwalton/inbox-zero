import { z } from "zod";
import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withEmailAccount } from "@/utils/middleware";

export const GET = withEmailAccount(async (request) => {
  const { emailAccountId } = request.auth;

  const toneProfile = await prisma.toneProfile.findUnique({
    where: { emailAccountId },
  });

  if (!toneProfile) {
    return NextResponse.json(null);
  }

  return NextResponse.json(toneProfile);
});

const updateToneProfileSchema = z.object({
  avgSentenceLength: z.number().min(1).max(100).optional(),
  commonOpeners: z.array(z.string().max(200)).max(20).optional(),
  commonSignoffs: z.array(z.string().max(200)).max(20).optional(),
  formalityScore: z.number().min(1).max(5).optional(),
  commonPhrases: z.array(z.string().max(200)).max(50).optional(),
});

export const PUT = withEmailAccount(async (request) => {
  const { emailAccountId } = request.auth;
  const body = await request.json();

  const parsed = updateToneProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updateData = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const toneProfile = await prisma.toneProfile.upsert({
    where: { emailAccountId },
    create: {
      emailAccountId,
      ...updateData,
    },
    update: updateData,
  });

  return NextResponse.json(toneProfile);
});
