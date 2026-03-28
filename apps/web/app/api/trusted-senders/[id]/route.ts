import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withEmailAccount } from "@/utils/middleware";

export const DELETE = withEmailAccount(async (request, { params }) => {
  const { emailAccountId } = request.auth;
  const { id } = await params;

  const sender = await prisma.trustedSender.findFirst({
    where: { id, emailAccountId },
  });

  if (!sender) {
    return NextResponse.json(
      { error: "Trusted sender not found" },
      { status: 404 },
    );
  }

  await prisma.trustedSender.delete({ where: { id } });

  return NextResponse.json({ ok: true });
});
