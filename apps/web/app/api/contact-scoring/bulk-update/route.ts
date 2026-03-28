import { NextResponse } from "next/server";
import { withEmailAccount } from "@/utils/middleware";
import prisma from "@/utils/prisma";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  updates: z.array(
    z.object({
      contactEmail: z.string().email(),
      priorityScore: z.number().min(0).max(100),
      manualOverride: z.boolean(),
    }),
  ),
});

export const POST = withEmailAccount(async (request) => {
  const emailAccountId = request.auth.emailAccountId;
  const body = await request.json();
  const result = bulkUpdateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: result.error.issues },
      { status: 400 },
    );
  }

  const { updates } = result.data;

  await prisma.$transaction(
    updates.map((update) =>
      prisma.contactScore.upsert({
        where: {
          emailAccountId_contactEmail: {
            emailAccountId,
            contactEmail: update.contactEmail,
          },
        },
        update: {
          priorityScore: update.priorityScore,
          manualOverride: update.manualOverride,
        },
        create: {
          emailAccountId,
          contactEmail: update.contactEmail,
          priorityScore: update.priorityScore,
          manualOverride: update.manualOverride,
        },
      }),
    ),
  );

  return NextResponse.json({ success: true, count: updates.length });
});
