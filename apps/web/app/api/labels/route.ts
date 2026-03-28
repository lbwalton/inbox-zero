import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withEmailAccount } from "@/utils/middleware";

export const GET = withEmailAccount(async (request) => {
  const { emailAccountId } = request.auth;

  const labels = await prisma.suggestedLabel.findMany({
    where: { emailAccountId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(labels);
});
