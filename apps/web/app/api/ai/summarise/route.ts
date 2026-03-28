import { NextResponse } from "next/server";
import { summarise } from "@/app/api/ai/summarise/controller";
import { withEmailAccount } from "@/utils/middleware";
import { summariseBody } from "@/app/api/ai/summarise/validation";
import { getSummary } from "@/utils/redis/summary";
import { emailToContent } from "@/utils/mail";
import { getEmailAccountWithAi } from "@/utils/user/get";
import { checkRateLimit } from "@/utils/rate-limit";

export const POST = withEmailAccount(async (request) => {
  const emailAccountId = request.auth.emailAccountId;

  // Rate limit: 30 requests per minute per user (LLM summarization)
  const rateLimited = checkRateLimit(
    `summarise:${request.auth.userId}`,
    30,
    60_000,
  );
  if (rateLimited) return rateLimited;

  const json = await request.json();
  const body = summariseBody.parse(json);

  const prompt = emailToContent({
    textHtml: body.textHtml || undefined,
    textPlain: body.textPlain || undefined,
    snippet: "",
  });

  if (!prompt)
    return NextResponse.json({ error: "No text provided" }, { status: 400 });

  const cachedSummary = await getSummary(prompt);
  if (cachedSummary) return new NextResponse(cachedSummary);

  const userAi = await getEmailAccountWithAi({ emailAccountId });

  if (!userAi)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const stream = await summarise({
    text: prompt,
    userEmail: userAi.email,
    userAi,
  });

  return stream.toTextStreamResponse();
});
