import { NextResponse } from "next/server";
import { withEmailAccount } from "@/utils/middleware";
import prisma from "@/utils/prisma";

export const dynamic = "force-dynamic";

export const GET = withEmailAccount(async (request) => {
  const emailAccountId = request.auth.emailAccountId;

  const contacts = await prisma.contactScore.findMany({
    where: { emailAccountId },
    orderBy: { priorityScore: "desc" },
    take: 20,
    select: {
      id: true,
      contactEmail: true,
      priorityScore: true,
      manualOverride: true,
    },
  });

  return NextResponse.json({ contacts });
});
