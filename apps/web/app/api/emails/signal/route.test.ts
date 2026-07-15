import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("@/utils/middleware", () => ({
  withAuth:
    (handler: (req: Request, ctx: unknown) => Promise<Response>) =>
    (req: Request & { auth?: { userId: string } }, ctx: unknown) => {
      req.auth = { userId: "user-1" };
      return handler(req, ctx);
    },
}));

vi.mock("@/utils/prisma", () => ({
  default: {
    emailAccount: { findFirst: vi.fn() },
    emailSignal: { upsert: vi.fn() },
  },
}));

vi.mock("@/utils/upstash", () => ({
  publishToQstash: vi.fn(),
}));

import prisma from "@/utils/prisma";
import { publishToQstash } from "@/utils/upstash";
import { POST } from "./route";

const ctx = { params: Promise.resolve({}) };

function post(body: unknown) {
  return new NextRequest("http://test/api/emails/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  threadId: "t1",
  senderEmail: "someone@test.com",
  signal: "IMPORTANT",
  emailAccountId: "acc-1",
};

describe("POST /api/emails/signal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.emailAccount.findFirst).mockResolvedValue({
      id: "acc-1",
    } as never);
    vi.mocked(prisma.emailSignal.upsert).mockResolvedValue({} as never);
  });

  it("returns saved:true when the QStash dispatch succeeds", async () => {
    vi.mocked(publishToQstash).mockResolvedValue(undefined as never);

    const res = await POST(post(validBody), ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: true });
  });

  it("still returns saved:true when the QStash dispatch fails (FIX-007)", async () => {
    vi.mocked(publishToQstash).mockRejectedValue(new Error("qstash down"));

    const res = await POST(post(validBody), ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved: true });
    expect(prisma.emailSignal.upsert).toHaveBeenCalledTimes(1);
  });
});
