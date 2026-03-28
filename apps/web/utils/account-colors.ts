/**
 * US-052: 6-color accessible palette for email account border colors.
 * Color is seeded by emailAccountId to be consistent.
 */

const ACCOUNT_COLORS = [
  "border-l-blue-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-rose-500",
  "border-l-purple-500",
  "border-l-cyan-500",
] as const;

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function getAccountColorClass(emailAccountId: string): string {
  const index = simpleHash(emailAccountId) % ACCOUNT_COLORS.length;
  return ACCOUNT_COLORS[index];
}
