import { env } from "@/env";

export function isAdmin({
  email,
  role,
}: {
  email?: string | null;
  role?: string | null;
}) {
  if (role === "ADMIN") return true;
  if (!email) return false;
  return env.ADMINS?.includes(email) ?? false;
}
