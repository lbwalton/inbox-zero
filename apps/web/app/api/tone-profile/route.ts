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

export const PUT = withEmailAccount(async (request) => {
  const { emailAccountId } = request.auth;
  const body = await request.json();

  const allowedFields = [
    "avgSentenceLength",
    "commonOpeners",
    "commonSignoffs",
    "formalityScore",
    "commonPhrases",
  ] as const;

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

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
