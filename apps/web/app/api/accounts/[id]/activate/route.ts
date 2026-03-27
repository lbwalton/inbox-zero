import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withAuth } from "@/utils/middleware";
import { SafeError } from "@/utils/error";

export const PUT = withAuth(async (request, { params }) => {
  const userId = request.auth.userId;
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing account id" }, { status: 400 });
  }

  // Verify the account belongs to this user
  const account = await prisma.emailAccount.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!account) {
    throw new SafeError("Email account not found");
  }

  // Clear isDefault on all user accounts, then set the target
  await prisma.$transaction([
    prisma.emailAccount.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    prisma.emailAccount.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  return NextResponse.json({ success: true });
});
