import { NextResponse } from "next/server";
import { withAuth } from "@/utils/middleware";
import prisma from "@/utils/prisma";
import { isAdmin } from "@/utils/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });

  if (!isAdmin({ email: user?.email, role: user?.role })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count(),
  ]);

  // Resolve admin and target user emails
  const userIds = [
    ...new Set(
      logs.flatMap((l) => [l.adminUserId, l.targetUserId].filter(Boolean)),
    ),
  ] as string[];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });

  const emailMap = new Map(users.map((u) => [u.id, u.email]));

  const enrichedLogs = logs.map((log) => ({
    ...log,
    adminEmail: emailMap.get(log.adminUserId) ?? "Unknown",
    targetEmail: log.targetUserId
      ? (emailMap.get(log.targetUserId) ?? "Unknown")
      : null,
  }));

  return NextResponse.json({
    logs: enrichedLogs,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
});
