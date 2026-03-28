import OpenAI from "openai";
import prisma from "@/utils/prisma";
import { env } from "@/env";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("alias-resolver");

const EMBEDDING_MODEL = "text-embedding-3-small";

export interface AliasMatch {
  contactEmail: string;
  contactName: string | null;
  similarityScore: number;
  emailAccountId: string;
  confirmed?: boolean;
}

function getOpenAIClient(): OpenAI {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for alias resolution");
  }
  return new OpenAI({ apiKey });
}

/**
 * Resolves a natural language phrase to the best-matching contacts.
 *
 * 1. First checks ContactAlias table for an exact (case-insensitive) phrase match.
 *    If found, returns it immediately with confirmed: true.
 * 2. Otherwise, embeds the phrase and runs a pgvector cosine similarity search
 *    across all ContactEmbedding records for the user's email accounts.
 * 3. Returns top 3 matches sorted by similarity.
 */
export async function resolveAlias(
  userId: string,
  phrase: string,
): Promise<AliasMatch[]> {
  logger.info("Resolving alias", { userId, phrase });

  // 1. Check for exact confirmed alias
  const existingAlias = await prisma.contactAlias.findFirst({
    where: {
      userId,
      phrase: { equals: phrase, mode: "insensitive" },
    },
  });

  if (existingAlias) {
    logger.info("Found confirmed alias", {
      phrase,
      email: existingAlias.resolvedEmail,
    });
    return [
      {
        contactEmail: existingAlias.resolvedEmail,
        contactName: existingAlias.resolvedName,
        similarityScore: 1.0,
        emailAccountId: existingAlias.emailAccountId,
        confirmed: true,
      },
    ];
  }

  // 2. Get all email account IDs for this user
  const emailAccounts = await prisma.emailAccount.findMany({
    where: { userId },
    select: { id: true },
  });

  if (emailAccounts.length === 0) {
    logger.info("No email accounts found for user", { userId });
    return [];
  }

  const accountIds = emailAccounts.map((a) => a.id);

  // 3. Embed the input phrase
  const openai = getOpenAIClient();
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: phrase,
  });

  const queryVector = embeddingResponse.data[0].embedding;
  // Validate that all embedding values are finite numbers to prevent injection
  if (!queryVector.every((v) => Number.isFinite(v))) {
    logger.error("Invalid embedding values received from OpenAI");
    return [];
  }
  const vectorStr = `[${queryVector.join(",")}]`;

  // 4. Run pgvector cosine similarity search using parameterized $queryRaw
  //    The <=> operator computes cosine distance; similarity = 1 - distance
  const results: Array<{
    contactEmail: string;
    contactName: string | null;
    emailAccountId: string;
    similarity: number;
  }> = await prisma.$queryRaw`
    SELECT
      "contactEmail",
      "contactName",
      "emailAccountId",
      1 - ("embedding" <=> ${vectorStr}::vector(1536)) AS similarity
    FROM "ContactEmbedding"
    WHERE "emailAccountId" = ANY(${accountIds}::text[])
    ORDER BY "embedding" <=> ${vectorStr}::vector(1536)
    LIMIT 3
  `;

  logger.info("Alias resolution results", {
    phrase,
    resultCount: results.length,
  });

  return results.map((r) => ({
    contactEmail: r.contactEmail,
    contactName: r.contactName,
    similarityScore: Number(r.similarity),
    emailAccountId: r.emailAccountId,
  }));
}
