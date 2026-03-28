import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { withAuth } from "@/utils/middleware";

export type GetFocusModeResponse = Awaited<ReturnType<typeof getFocusMode>>;

async function getFocusMode({ userId }: { userId: string }) {
  const focusMode = await prisma.focusMode.findUnique({
    where: { userId },
  });

  return focusMode;
}

const updateFocusModeSchema = z.object({
  isActive: z.boolean().optional(),
  focusedAccountId: z.string().nullable().optional(),
  scheduleEnabled: z.boolean().optional(),
  scheduleStartHour: z.number().int().min(0).max(23).nullable().optional(),
  scheduleEndHour: z.number().int().min(0).max(23).nullable().optional(),
  scheduleTimezone: z.string().nullable().optional(),
  breakthroughThreshold: z.number().int().min(0).max(100).optional(),
});

export type UpdateFocusModeBody = z.infer<typeof updateFocusModeSchema>;

export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;
  const focusMode = await getFocusMode({ userId });
  return NextResponse.json(focusMode);
});

export const PUT = withAuth(async (request) => {
  const userId = request.auth.userId;
  const body = await request.json();
  const parsed = updateFocusModeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  // If focusedAccountId is provided, verify it belongs to this user
  if (data.focusedAccountId) {
    const account = await prisma.emailAccount.findFirst({
      where: { id: data.focusedAccountId, userId },
      select: { id: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Email account not found", isKnownError: true },
        { status: 400 },
      );
    }
  }

  const focusMode = await prisma.focusMode.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
    },
    update: {
      ...data,
    },
  });

  return NextResponse.json(focusMode);
});
