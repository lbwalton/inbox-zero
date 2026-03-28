import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { withAuth } from "@/utils/middleware";

export type GetBntlySettingsResponse = Awaited<
  ReturnType<typeof getBntlySettings>
>;

async function getBntlySettings({ userId }: { userId: string }) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      slackEnabled: true,
      smsEnabled: true,
      emailDigestEnabled: true,
      emailDigestTimeUtc: true,
      pushEnabled: true,
      autoDraftEnabled: true,
      autoDraftThreshold: true,
      outboundNudgeDays: true,
      inboundNudgeDays: true,
      junkAutoPurge: true,
      junkAutoPurgeDays: true,
    },
  });

  return user;
}

const updateBntlySettingsSchema = z.object({
  slackEnabled: z.boolean().optional(),
  slackWebhookUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://hooks.slack.com/"), {
      message: "Must be a Slack webhook URL",
    })
    .nullable()
    .optional(),
  smsEnabled: z.boolean().optional(),
  smsPhoneEncrypted: z.string().nullable().optional(),
  emailDigestEnabled: z.boolean().optional(),
  emailDigestTimeUtc: z.number().int().min(0).max(23).optional(),
  pushEnabled: z.boolean().optional(),
  autoDraftEnabled: z.boolean().optional(),
  autoDraftThreshold: z.number().int().min(0).max(100).optional(),
  outboundNudgeDays: z.number().int().min(1).max(30).optional(),
  inboundNudgeDays: z.number().int().min(1).max(30).optional(),
  junkAutoPurge: z.boolean().optional(),
  junkAutoPurgeDays: z.number().int().min(1).max(365).optional(),
});

export type UpdateBntlySettingsBody = z.infer<typeof updateBntlySettingsSchema>;

export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;
  const settings = await getBntlySettings({ userId });
  return NextResponse.json(settings);
});

export const PATCH = withAuth(async (request) => {
  const userId = request.auth.userId;
  const body = await request.json();
  const parsed = updateBntlySettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      slackEnabled: true,
      slackWebhookUrl: true,
      smsEnabled: true,
      smsPhoneEncrypted: true,
      emailDigestEnabled: true,
      emailDigestTimeUtc: true,
      pushEnabled: true,
      autoDraftEnabled: true,
      autoDraftThreshold: true,
      outboundNudgeDays: true,
      inboundNudgeDays: true,
      junkAutoPurge: true,
      junkAutoPurgeDays: true,
    },
  });

  return NextResponse.json(updated);
});
