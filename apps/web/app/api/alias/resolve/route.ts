import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/utils/middleware";
import { resolveAlias } from "@/utils/alias-resolver";

const resolveSchema = z.object({
  phrase: z.string().min(1),
});

/**
 * POST /api/alias/resolve — resolve a natural language phrase to contacts
 * Returns top 3 matches from vector similarity search, or a confirmed alias.
 */
export const POST = withAuth(async (request) => {
  const userId = request.auth.userId;
  const body = await request.json();
  const { phrase } = resolveSchema.parse(body);

  const matches = await resolveAlias(userId, phrase);

  return NextResponse.json({ matches });
});
