import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("@/utils/prisma", () => ({
  default: {
    contactScore: { findMany: vi.fn(), update: vi.fn() },
    emailSignal: { findMany: vi.fn() },
    emailMessage: { groupBy: vi.fn() },
  },
}));

import prisma from "@/utils/prisma";
import { computeContactScore, calculateContactScores } from "./contact-scoring";

const baseline = {
  replyRate: 0.5,
  avgReplyTimeHours: 24,
  threadCount: 5,
  maxThreadCount: 10,
  importantCount: 0,
  notImportantCount: 0,
};

describe("computeContactScore", () => {
  it("a NOT_IMPORTANT tag strictly lowers the score vs the untagged baseline", () => {
    const untagged = computeContactScore(baseline);
    const tagged = computeContactScore({ ...baseline, notImportantCount: 1 });
    expect(tagged).toBeLessThan(untagged);
    expect(tagged).toBeCloseTo(untagged - 10);
  });

  it("an IMPORTANT tag strictly raises the score vs the untagged baseline", () => {
    const untagged = computeContactScore(baseline);
    const tagged = computeContactScore({ ...baseline, importantCount: 1 });
    expect(tagged).toBeGreaterThan(untagged);
    expect(tagged).toBeCloseTo(untagged + 5);
  });

  it("caps the IMPORTANT bonus at +15", () => {
    const untagged = computeContactScore(baseline);
    const tagged = computeContactScore({ ...baseline, importantCount: 10 });
    expect(tagged).toBeCloseTo(untagged + 15);
  });

  it("thread frequency contributes through email volume, not signals", () => {
    const noThreads = computeContactScore({ ...baseline, threadCount: 0 });
    const maxThreads = computeContactScore({ ...baseline, threadCount: 10 });
    // 25-point frequency band between zero volume and the most active contact
    expect(maxThreads).toBeCloseTo(noThreads + 25);
  });

  it("regression (FIX-008): a signal no longer manufactures frequency, so a lone NOT_IMPORTANT tag cannot net a gain", () => {
    // Old behavior: 1 NOT_IMPORTANT signal => threadCount 1/1 => +25 frequency, -10 penalty = +15 net
    const untagged = computeContactScore({ ...baseline, threadCount: 0 });
    const tagged = computeContactScore({
      ...baseline,
      threadCount: 0, // identical real volume
      notImportantCount: 1,
    });
    expect(tagged).toBeCloseTo(untagged - 10);
  });

  it("clamps to the 0-100 range", () => {
    expect(
      computeContactScore({
        replyRate: 0,
        avgReplyTimeHours: 168,
        threadCount: 0,
        maxThreadCount: 1,
        importantCount: 0,
        notImportantCount: 3,
      }),
    ).toBe(0);
  });
});

describe("calculateContactScores (fixture re-run with mocked prisma)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("orders identical contacts by their tags: IMPORTANT > untagged > NOT_IMPORTANT", async () => {
    const contacts = [
      {
        id: "a",
        contactEmail: "alice@test.com",
        replyRate: 0.5,
        avgReplyTimeHours: 24,
      },
      {
        id: "b",
        contactEmail: "bob@test.com",
        replyRate: 0.5,
        avgReplyTimeHours: 24,
      },
      {
        id: "c",
        contactEmail: "carol@test.com",
        replyRate: 0.5,
        avgReplyTimeHours: 24,
      },
    ];
    vi.mocked(prisma.contactScore.findMany).mockResolvedValue(
      contacts as never,
    );
    vi.mocked(prisma.emailSignal.findMany).mockResolvedValue([
      { senderEmail: "bob@test.com", signal: "NOT_IMPORTANT" },
      { senderEmail: "carol@test.com", signal: "IMPORTANT" },
    ] as never);
    // identical real email volume for all three: 2 threads each
    vi.mocked(prisma.emailMessage.groupBy).mockResolvedValue(
      contacts.flatMap((c) => [
        { from: c.contactEmail, threadId: `${c.id}-t1` },
        { from: c.contactEmail, threadId: `${c.id}-t2` },
      ]) as never,
    );
    vi.mocked(prisma.contactScore.update).mockResolvedValue({} as never);

    await calculateContactScores("acc-1");

    const scores = new Map(
      vi
        .mocked(prisma.contactScore.update)
        .mock.calls.map(([args]) => [
          args.where.id,
          args.data.priorityScore as number,
        ]),
    );

    expect(scores.get("c")).toBeGreaterThan(scores.get("a")!);
    expect(scores.get("a")).toBeGreaterThan(scores.get("b")!);
    expect(scores.get("b")).toBeCloseTo(scores.get("a")! - 10);
    expect(scores.get("c")).toBeCloseTo(scores.get("a")! + 5);
  });
});
