import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withAuth } from "@/utils/middleware";

// Stub for US-020: PUT /api/user/email-accounts/:id/activate
// Sets the given account as default and unsets all others for the user.
export const PUT = withAuth(async (request, { params }) => {
  const { id } = await params;
  const userId = request.auth.userId;

  // Verify the account belongs to this user
  const account = await prisma.emailAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Unset all defaults, then set the requested account as default
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
