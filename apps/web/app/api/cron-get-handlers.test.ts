import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
  env: {
    CRON_SECRET: "test-cron-secret",
    NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
  },
}));

vi.mock("@/utils/middleware", () => ({
  withError: (handler: (req: Request) => Promise<Response>) => handler,
}));

vi.mock("@/utils/prisma", () => ({
  default: {
    nudgeLog: { findMany: vi.fn().mockResolvedValue([]) },
    emailAccount: { findMany: vi.fn().mockResolvedValue([]) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/utils/upstash", () => ({
  publishToQstashQueue: vi.fn(),
}));

vi.mock("@/utils/nudge-dispatcher", () => ({
  dispatchNudges: vi.fn(),
}));

vi.mock("@/utils/error", () => ({
  captureException: vi.fn(),
  checkCommonErrors: vi.fn(),
  SafeError: class SafeError extends Error {},
}));

import * as nudgeDetect from "./nudge/detect/route";
import * as nudgeDigest from "./nudge/digest/route";
import * as nudgeDispatch from "./nudge/dispatch/route";
import * as junkPurge from "./junk/purge/route";
import * as labelsSuggest from "./labels/suggest/route";
import * as contactScoringRun from "./contact-scoring/run/route";
import * as toneProfileScan from "./tone-profile/scan/route";

// Every route registered in vercel.json crons must accept GET, because
// Vercel scheduled crons invoke with GET.
const cronRoutes = {
  "nudge/detect": nudgeDetect,
  "nudge/digest": nudgeDigest,
  "nudge/dispatch": nudgeDispatch,
  "junk/purge": junkPurge,
  "labels/suggest": labelsSuggest,
  "contact-scoring/run": contactScoringRun,
  "tone-profile/scan": toneProfileScan,
} as const;

describe("cron routes accept GET", () => {
  for (const [name, mod] of Object.entries(cronRoutes)) {
    it(`${name} exports a GET handler`, () => {
      expect(typeof mod.GET).toBe("function");
    });
  }

  it("GET without the cron secret is rejected on all cron routes", async () => {
    for (const [name, mod] of Object.entries(cronRoutes)) {
      const res = await mod.GET(
        new Request(`http://test/api/${name}`, { method: "GET" }),
      );
      expect(res.status, `${name} should 401 without secret`).toBe(401);
    }
  });

  it("GET nudge/dispatch with the secret runs fan-out mode (no body on GET)", async () => {
    const res = await nudgeDispatch.GET(
      new Request("http://test/api/nudge/dispatch", {
        method: "GET",
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      mode: "fan-out",
      published: 0,
      failed: 0,
    });
  });

  it("GET nudge/detect with the secret returns accurate dispatch counts", async () => {
    const res = await nudgeDetect.GET(
      new Request("http://test/api/nudge/detect", {
        method: "GET",
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, dispatched: 0, failed: 0 });
  });
});
