/**
 * Simple in-memory sliding-window rate limiter.
 *
 * On Vercel serverless each instance has its own map, so this provides
 * per-instance protection rather than global rate limiting.  For global
 * limits, swap this for @upstash/ratelimit backed by Redis.
 */

import { NextResponse } from "next/server";

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

/**
 * Check whether the given key has exceeded the rate limit.
 *
 * @param key    Unique identifier (e.g. userId or userId:route)
 * @param limit  Maximum requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns `null` if allowed, or a 429 `NextResponse` if rate-limited
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(windowMs / 1000)),
        },
      },
    );
  }

  entry.timestamps.push(now);
  return null;
}
