import { PrismaClient } from "@prisma/client";
import { encryptedTokens } from "@/utils/prisma-extensions";

/**
 * Creates a Prisma client that sets RLS session variables before each query.
 * Use this in authenticated request handlers so RLS policies are enforced.
 *
 * @param userId - The authenticated user's ID
 * @param userRole - The user's role (USER or ADMIN)
 */
export function createRlsClient(
  userId: string,
  userRole: string = "USER",
): PrismaClient {
  const rlsDatabaseUrl = process.env.RLS_DATABASE_URL;

  // If no RLS_DATABASE_URL is configured, fall back to the default client
  // This allows gradual rollout — RLS is only enforced when the env var is set
  if (!rlsDatabaseUrl) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("@/utils/prisma").default;
  }

  const client = new PrismaClient({
    datasourceUrl: rlsDatabaseUrl,
  });

  const extended = client.$extends({
    query: {
      async $allOperations({ args, query }) {
        // Set RLS session context before each query using a transaction
        const [, result] = await client.$transaction([
          client.$executeRawUnsafe(
            `SELECT set_config('app.user_id', '${userId}', true), set_config('app.user_role', '${userRole}', true)`,
          ),
          query(args),
        ]);
        return result;
      },
    },
  });

  // Apply encrypted tokens extension too
  return extended.$extends(encryptedTokens) as unknown as PrismaClient;
}
