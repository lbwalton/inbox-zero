import { NextResponse } from "next/server";
import { z } from "zod";
import { withEmailAccount } from "@/utils/middleware";
import {
  acceptPrioritySuggestion,
  dismissPrioritySuggestion,
} from "@/utils/ai/priority/suggest";

const actionSchema = z.object({
  threadId: z.string(),
  senderEmail: z.string().email(),
  action: z.enum(["accept", "dismiss"]),
});

export const POST = withEmailAccount(async (request) => {
  const emailAccountId = request.auth.emailAccountId;
  const json = await request.json();
  const result = actionSchema.safeParse(json);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: result.error.issues },
      { status: 400 },
    );
  }

  const { threadId, senderEmail, action } = result.data;

  if (action === "accept") {
    await acceptPrioritySuggestion({ emailAccountId, threadId, senderEmail });
  } else {
    await dismissPrioritySuggestion({ emailAccountId, threadId, senderEmail });
  }

  return NextResponse.json({ success: true, action });
});
