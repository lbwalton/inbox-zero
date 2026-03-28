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
  const search = searchParams.get("search") || "";

  const where = search
    ? { email: { contains: search, mode: "insensitive" as const } }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        premium: { select: { tier: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
});
