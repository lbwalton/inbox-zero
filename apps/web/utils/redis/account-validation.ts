import "server-only";
import { redis } from "@/utils/redis";
import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("account-validation");

const EXPIRATION = 60 * 60; // 1 hour

// Redis is a cache here: an outage must degrade to DB lookups, not take
// down every account-scoped route. Cap how long we wait for it and how
// often we log about it being gone.
const REDIS_TIMEOUT_MS = 1000;
const REDIS_ERROR_LOG_INTERVAL_MS = 60 * 1000;

let lastRedisErrorLoggedAt = 0;

function logRedisErrorThrottled(operation: string, error: unknown) {
  const now = Date.now();
  if (now - lastRedisErrorLoggedAt < REDIS_ERROR_LOG_INTERVAL_MS) return;
  lastRedisErrorLoggedAt = now;
  logger.error("Redis unavailable, falling back to database", {
    operation,
    error: error instanceof Error ? error.message : error,
  });
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Redis timeout after ${REDIS_TIMEOUT_MS}ms`)),
          REDIS_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Get the Redis key for account validation
 */
function getValidationKey({
  userId,
  emailAccountId,
}: {
  userId: string;
  emailAccountId: string;
}): string {
  return `account:${userId}:${emailAccountId}`;
}

/**
 * Validate that an account belongs to a user, using Redis for caching.
 * Any Redis failure (down, unreachable, slow) falls back to the database.
 * @param userId The user ID
 * @param accountId The account ID to validate
 * @returns email address of the account if it belongs to the user, otherwise null
 */
export async function getEmailAccount({
  userId,
  emailAccountId,
}: {
  userId: string;
  emailAccountId: string;
}): Promise<string | null> {
  if (!userId || !emailAccountId) return null;

  const key = getValidationKey({ userId, emailAccountId });

  // Check Redis cache first; treat a broken cache as a miss
  try {
    const cachedResult = await withTimeout(redis.get<string>(key));
    if (cachedResult !== null) {
      return cachedResult;
    }
  } catch (error) {
    logRedisErrorThrottled("get", error);
  }

  // Not in cache (or cache down), check database
  const emailAccount = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId, userId },
    select: { email: true },
  });

  // Cache the result; a failed write only costs us the next lookup
  try {
    await withTimeout(
      redis.set(key, emailAccount?.email ?? null, { ex: EXPIRATION }),
    );
  } catch (error) {
    logRedisErrorThrottled("set", error);
  }

  return emailAccount?.email ?? null;
}

/**
 * Invalidate the cached validation result for a user's account
 * Useful when account ownership changes
 */
export async function invalidateAccountValidation({
  userId,
  emailAccountId,
}: {
  userId: string;
  emailAccountId: string;
}): Promise<void> {
  const key = getValidationKey({ userId, emailAccountId });
  try {
    await withTimeout(redis.del(key));
  } catch (error) {
    // If Redis is down there is no cache to invalidate; entries expire in 1h
    logRedisErrorThrottled("del", error);
  }
}
