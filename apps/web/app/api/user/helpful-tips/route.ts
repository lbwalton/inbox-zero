import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withAuth } from "@/utils/middleware";

export const PUT = withAuth(async (request) => {
  const userId = request.auth.userId;
  const body = await request.json();
  const { showHelpfulTips } = body;

  if (typeof showHelpfulTips !== "boolean") {
    return NextResponse.json(
      { error: "showHelpfulTips must be a boolean" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { showHelpfulTips },
  });

  return NextResponse.json({ showHelpfulTips });
});
