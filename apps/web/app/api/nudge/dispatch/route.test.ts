import { describe, it, expect, vi, beforeEach } from "vitest";

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
    nudgeLog: { findMany: vi.fn() },
    emailAccount: { findMany: vi.fn() },
  },
}));

vi.mock("@/utils/upstash", () => ({
  publishToQstashQueue: vi.fn(),
}));

vi.mock("@/utils/nudge-dispatcher", () => ({
  dispatchNudges: vi.fn(),
}));

import prisma from "@/utils/prisma";
import { publishToQstashQueue } from "@/utils/upstash";
import { dispatchNudges } from "@/utils/nudge-dispatcher";
import { POST as dispatchPOST } from "./route";
import { POST as detectPOST } from "../detect/route";

const AUTH = { authorization: "Bearer test-cron-secret" };

function post(url: string, body?: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("POST /api/nudge/dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without the cron secret", async () => {
    const res = await dispatchPOST(
      new Request("http://test/api/nudge/dispatch", { method: "POST" }),
    );
    expect(res.status).toBe(401);
  });

  it("worker mode: calls dispatchNudges and never publishes", async () => {
    const res = await dispatchPOST(
      post("http://test/api/nudge/dispatch", { userId: "user-1" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      mode: "worker",
      userId: "user-1",
    });
    expect(dispatchNudges).toHaveBeenCalledWith("user-1");
    expect(publishToQstashQueue).not.toHaveBeenCalled();
  });

  it("worker mode: rejects a non-string userId", async () => {
    const res = await dispatchPOST(
      post("http://test/api/nudge/dispatch", { userId: 123 }),
    );
    expect(res.status).toBe(400);
    expect(dispatchNudges).not.toHaveBeenCalled();
  });

  it("fan-out mode: publishes one worker call per user and never dispatches inline", async () => {
    vi.mocked(prisma.nudgeLog.findMany).mockResolvedValue([
      { emailAccount: { userId: "user-1" } },
      { emailAccount: { userId: "user-2" } },
      { emailAccount: { userId: "user-1" } },
    ] as never);
    vi.mocked(publishToQstashQueue).mockResolvedValue(undefined as never);

    const res = await dispatchPOST(post("http://test/api/nudge/dispatch"));

    expect(await res.json()).toEqual({
      ok: true,
      mode: "fan-out",
      published: 2,
      failed: 0,
    });
    expect(publishToQstashQueue).toHaveBeenCalledTimes(2);
    expect(publishToQstashQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "http://localhost:3000/api/nudge/dispatch",
        body: { userId: "user-1" },
      }),
    );
    expect(dispatchNudges).not.toHaveBeenCalled();
  });

  it("fan-out mode: counts failed publishes instead of reporting them dispatched", async () => {
    vi.mocked(prisma.nudgeLog.findMany).mockResolvedValue([
      { emailAccount: { userId: "user-1" } },
      { emailAccount: { userId: "user-2" } },
    ] as never);
    vi.mocked(publishToQstashQueue)
      .mockResolvedValueOnce(undefined as never)
      .mockRejectedValueOnce(new Error("qstash down"));

    const res = await dispatchPOST(post("http://test/api/nudge/dispatch"));

    expect(await res.json()).toEqual({
      ok: true,
      mode: "fan-out",
      published: 1,
      failed: 1,
    });
  });
});

describe("POST /api/nudge/detect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports accurate dispatched/failed counts when publishes fail", async () => {
    vi.mocked(prisma.emailAccount.findMany).mockResolvedValue([
      { id: "acc-1", email: "a@test.com" },
      { id: "acc-2", email: "b@test.com" },
    ] as never);
    // acc-1: outbound + inbound succeed; acc-2: outbound publish fails
    vi.mocked(publishToQstashQueue)
      .mockResolvedValueOnce(undefined as never)
      .mockResolvedValueOnce(undefined as never)
      .mockRejectedValueOnce(new Error("qstash down"));

    const res = await detectPOST(post("http://test/api/nudge/detect"));

    expect(await res.json()).toEqual({ ok: true, dispatched: 1, failed: 1 });
  });

  it("reports all accounts dispatched when every publish succeeds", async () => {
    vi.mocked(prisma.emailAccount.findMany).mockResolvedValue([
      { id: "acc-1", email: "a@test.com" },
      { id: "acc-2", email: "b@test.com" },
    ] as never);
    vi.mocked(publishToQstashQueue).mockResolvedValue(undefined as never);

    const res = await detectPOST(post("http://test/api/nudge/detect"));

    expect(await res.json()).toEqual({ ok: true, dispatched: 2, failed: 0 });
  });
});
