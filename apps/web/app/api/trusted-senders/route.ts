import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { withEmailAccount } from "@/utils/middleware";

export type GetTrustedSendersResponse = Awaited<
  ReturnType<typeof getTrustedSenders>
>;

async function getTrustedSenders({
  emailAccountId,
}: {
  emailAccountId: string;
}) {
  return prisma.trustedSender.findMany({
    where: { emailAccountId },
    orderBy: { addedAt: "desc" },
  });
}

const createTrustedSenderSchema = z.object({
  type: z.enum(["CONTACT", "TEAM_DOMAIN", "CLIENT_DOMAIN"]),
  value: z.string().min(1),
});

export type CreateTrustedSenderBody = z.infer<typeof createTrustedSenderSchema>;

export const GET = withEmailAccount(async (request) => {
  const { emailAccountId } = request.auth;
  const senders = await getTrustedSenders({ emailAccountId });
  return NextResponse.json(senders);
});

export const POST = withEmailAccount(async (request) => {
  const { emailAccountId } = request.auth;
  const body = await request.json();
  const parsed = createTrustedSenderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const sender = await prisma.trustedSender.create({
    data: {
      emailAccountId,
      type: data.type,
      value: data.value,
      addedManually: true,
    },
  });

  return NextResponse.json(sender);
});
