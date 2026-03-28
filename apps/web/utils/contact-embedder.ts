import OpenAI from "openai";
import prisma from "@/utils/prisma";
import { env } from "@/env";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("contact-embedder");

const EMBEDDING_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100;

function getOpenAIClient(): OpenAI {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required for contact embedding generation",
    );
  }
  return new OpenAI({ apiKey });
}

/**
 * Build the text input that will be embedded for a contact.
 * Format: "email name label1 label2 replyRate:X avgReplyTime:Y priority:Z"
 */
function buildEmbeddingInput(contact: {
  contactEmail: string;
  contactName?: string | null;
  labels: string[];
  replyRate?: number;
  avgReplyTimeHours?: number;
  priorityScore?: number;
}): string {
  const parts: string[] = [contact.contactEmail];

  if (contact.contactName) {
    parts.push(contact.contactName);
  }

  if (contact.labels.length > 0) {
    parts.push(...contact.labels);
  }

  if (contact.replyRate !== undefined) {
    parts.push(`replyRate:${contact.replyRate.toFixed(2)}`);
  }
  if (contact.avgReplyTimeHours !== undefined) {
    parts.push(`avgReplyTime:${contact.avgReplyTimeHours.toFixed(1)}`);
  }
  if (contact.priorityScore !== undefined) {
    parts.push(`priority:${contact.priorityScore.toFixed(0)}`);
  }

  return parts.join(" ");
}

/**
 * Generates vector embeddings for all contacts associated with an email account.
 *
 * - Fetches top 100 ContactScore records for the account
 * - Fetches TrustedSender records for label context
 * - Constructs embedding input strings and calls OpenAI Embeddings API
 * - Upserts results into ContactEmbedding table via raw SQL (pgvector)
 */
export async function generateContactEmbeddings(
  emailAccountId: string,
): Promise<void> {
  logger.info("Starting contact embedding generation", { emailAccountId });

  // 1. Fetch top 100 contacts by priority score
  const contactScores = await prisma.contactScore.findMany({
    where: { emailAccountId },
    orderBy: { priorityScore: "desc" },
    take: BATCH_SIZE,
    select: {
      contactEmail: true,
      replyRate: true,
      avgReplyTimeHours: true,
      priorityScore: true,
    },
  });

  if (contactScores.length === 0) {
    logger.info("No contacts found for embedding generation", {
      emailAccountId,
    });
    return;
  }

  // 2. Fetch trusted senders for label context
  const trustedSenders = await prisma.trustedSender.findMany({
    where: { emailAccountId },
    select: { value: true, type: true },
  });

  const trustedMap = new Map<string, string[]>();
  for (const ts of trustedSenders) {
    const existing = trustedMap.get(ts.value) ?? [];
    existing.push(ts.type);
    trustedMap.set(ts.value, existing);
  }

  // 3. Build embedding inputs
  const contacts = contactScores.map((cs) => {
    const emailDomain = cs.contactEmail.split("@")[1];
    const labels: string[] = [];

    // Check direct contact match
    const contactLabels = trustedMap.get(cs.contactEmail);
    if (contactLabels) {
      labels.push(...contactLabels);
    }
    // Check domain match
    if (emailDomain) {
      const domainLabels = trustedMap.get(emailDomain);
      if (domainLabels) {
        labels.push(...domainLabels);
      }
    }

    return {
      contactEmail: cs.contactEmail,
      contactName: null as string | null,
      embeddingInput: buildEmbeddingInput({
        contactEmail: cs.contactEmail,
        labels,
        replyRate: cs.replyRate,
        avgReplyTimeHours: cs.avgReplyTimeHours,
        priorityScore: cs.priorityScore,
      }),
    };
  });

  // 4. Generate embeddings via OpenAI
  const openai = getOpenAIClient();
  const inputs = contacts.map((c) => c.embeddingInput);

  logger.info("Generating embeddings", { count: inputs.length });

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  });

  // 5. Upsert into ContactEmbedding using raw SQL for vector column
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const embedding = response.data[i].embedding;
    const vectorStr = `[${embedding.join(",")}]`;

    await prisma.$executeRaw`
      INSERT INTO "ContactEmbedding" ("id", "emailAccountId", "contactEmail", "contactName", "embedding", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${emailAccountId},
        ${contact.contactEmail},
        ${contact.contactName},
        ${vectorStr}::vector(1536),
        NOW()
      )
      ON CONFLICT ("emailAccountId", "contactEmail")
      DO UPDATE SET
        "contactName" = EXCLUDED."contactName",
        "embedding" = EXCLUDED."embedding",
        "updatedAt" = NOW()
    `;
  }

  logger.info("Contact embedding generation complete", {
    emailAccountId,
    count: contacts.length,
  });
}
