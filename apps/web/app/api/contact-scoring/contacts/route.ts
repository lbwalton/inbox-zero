import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withEmailAccount } from "@/utils/middleware";

export type GetContactScoresResponse = Awaited<
  ReturnType<typeof getContactScores>
>;

async function getContactScores({
  emailAccountId,
}: {
  emailAccountId: string;
}) {
  return prisma.contactScore.findMany({
    where: { emailAccountId },
    orderBy: { priorityScore: "desc" },
    take: 50,
  });
}

export const GET = withEmailAccount(async (request) => {
  const { emailAccountId } = request.auth;
  const contacts = await getContactScores({ emailAccountId });
  return NextResponse.json(contacts);
});
