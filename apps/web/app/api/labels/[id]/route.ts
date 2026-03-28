import { z } from "zod";
import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withEmailAccount } from "@/utils/middleware";
import { getGmailClientForEmailId } from "@/utils/account";
import { getOrCreateLabel } from "@/utils/gmail/label";

const updateSchema = z.object({
  status: z.enum(["APPROVED", "DISMISSED"]),
});

export const PUT = withEmailAccount(async (request, { params }) => {
  const { emailAccountId } = request.auth;
  const { id } = await params;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid status. Must be APPROVED or DISMISSED." },
      { status: 400 },
    );
  }

  const { status } = parsed.data;

  // Verify the label belongs to this email account
  const label = await prisma.suggestedLabel.findFirst({
    where: { id, emailAccountId },
  });

  if (!label) {
    return NextResponse.json(
      { error: "Suggested label not found" },
      { status: 404 },
    );
  }

  if (label.status !== "PENDING") {
    return NextResponse.json(
      { error: "Label has already been processed" },
      { status: 400 },
    );
  }

  if (status === "APPROVED") {
    // Create the Gmail label
    const gmail = await getGmailClientForEmailId({ emailAccountId });
    const gmailLabel = await getOrCreateLabel({ gmail, name: label.labelName });

    await prisma.suggestedLabel.update({
      where: { id },
      data: {
        status: "APPROVED",
        gmailLabelId: gmailLabel?.id ?? null,
      },
    });

    return NextResponse.json({
      status: "APPROVED",
      gmailLabelId: gmailLabel?.id,
    });
  }

  // DISMISSED
  await prisma.suggestedLabel.update({
    where: { id },
    data: { status: "DISMISSED" },
  });

  return NextResponse.json({ status: "DISMISSED" });
});
