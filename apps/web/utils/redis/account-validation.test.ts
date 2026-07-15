import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const { loggerErrorSpy } = vi.hoisted(() => ({ loggerErrorSpy: vi.fn() }));

vi.mock("@/utils/logger", () => ({
  createScopedLogger: () => ({
    error: loggerErrorSpy,
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

vi.mock("@/env", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("@/utils/redis", () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));

vi.mock("@/utils/prisma", () => ({
  default: {
    emailAccount: { findUnique: vi.fn() },
  },
}));

import { redis } from "@/utils/redis";
import prisma from "@/utils/prisma";
import {
  getEmailAccount,
  invalidateAccountValidation,
} from "./account-validation";

const ids = { userId: "user-1", emailAccountId: "acc-1" };

describe("getEmailAccount with Redis healthy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the cached value without hitting the database", async () => {
    vi.mocked(redis.get).mockResolvedValue("cached@test.com");

    const result = await getEmailAccount(ids);

    expect(result).toBe("cached@test.com");
    expect(prisma.emailAccount.findUnique).not.toHaveBeenCalled();
  });

  it("falls through to the database on cache miss and caches the result", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue("OK" as never);
    vi.mocked(prisma.emailAccount.findUnique).mockResolvedValue({
      email: "db@test.com",
    } as never);

    const result = await getEmailAccount(ids);

    expect(result).toBe("db@test.com");
    expect(redis.set).toHaveBeenCalledWith(
      "account:user-1:acc-1",
      "db@test.com",
      { ex: 3600 },
    );
  });
});

describe("getEmailAccount with Redis down (FIX-006)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // reset the log throttle window between tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("falls back to the database when redis.get rejects", async () => {
    vi.mocked(redis.get).mockRejectedValue(new Error("fetch failed"));
    vi.mocked(redis.set).mockRejectedValue(new Error("fetch failed"));
    vi.mocked(prisma.emailAccount.findUnique).mockResolvedValue({
      email: "db@test.com",
    } as never);

    const result = await getEmailAccount(ids);

    expect(result).toBe("db@test.com");
  });

  it("returns null from the database path for a non-owned account even with Redis down", async () => {
    vi.mocked(redis.get).mockRejectedValue(new Error("fetch failed"));
    vi.mocked(redis.set).mockRejectedValue(new Error("fetch failed"));
    vi.mocked(prisma.emailAccount.findUnique).mockResolvedValue(null);

    const result = await getEmailAccount(ids);

    expect(result).toBeNull();
  });

  it("falls back to the database when redis.get hangs past the timeout", async () => {
    vi.mocked(redis.get).mockImplementation(
      () => new Promise(() => {}) as never,
    );
    vi.mocked(redis.set).mockResolvedValue("OK" as never);
    vi.mocked(prisma.emailAccount.findUnique).mockResolvedValue({
      email: "db@test.com",
    } as never);

    const pending = getEmailAccount(ids);
    await vi.advanceTimersByTimeAsync(1100);
    const result = await pending;

    expect(result).toBe("db@test.com");
  });

  it("never rejects invalidateAccountValidation when redis.del fails", async () => {
    vi.mocked(redis.del).mockRejectedValue(new Error("fetch failed"));

    await expect(invalidateAccountValidation(ids)).resolves.toBeUndefined();
  });

  it("throttles repeated Redis error logs to one per interval", async () => {
    // step past any throttle window opened by earlier tests in this file
    vi.setSystemTime(new Date("2026-07-15T12:10:00Z"));
    vi.mocked(redis.get).mockRejectedValue(new Error("fetch failed"));
    vi.mocked(redis.set).mockRejectedValue(new Error("fetch failed"));
    vi.mocked(prisma.emailAccount.findUnique).mockResolvedValue({
      email: "db@test.com",
    } as never);

    const before = loggerErrorSpy.mock.calls.length;
    await getEmailAccount(ids); // get + set failures within one interval
    await getEmailAccount(ids); // all inside the same 60s window
    const withinWindow = loggerErrorSpy.mock.calls.length - before;

    vi.setSystemTime(new Date("2026-07-15T12:12:00Z")); // past the window
    await getEmailAccount(ids);
    const afterWindow = loggerErrorSpy.mock.calls.length - before;

    expect(withinWindow).toBe(1);
    expect(afterWindow).toBe(2);
  });
});
