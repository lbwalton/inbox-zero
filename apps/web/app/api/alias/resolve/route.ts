import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/utils/middleware";
import { resolveAlias } from "@/utils/alias-resolver";
import { checkRateLimit } from "@/utils/rate-limit";

const resolveSchema = z.object({
  phrase: z.string().min(1),
});

/**
 * POST /api/alias/resolve — resolve a natural language phrase to contacts
 * Returns top 3 matches from vector similarity search, or a confirmed alias.
 */
export const POST = withAuth(async (request) => {
  const userId = request.auth.userId;

  // Rate limit: 30 requests per minute per user (embedding lookups)
  const rateLimited = checkRateLimit(`alias-resolve:${userId}`, 30, 60_000);
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { phrase } = parsed.data;

  const matches = await resolveAlias(userId, phrase);

  return NextResponse.json({ matches });
});
