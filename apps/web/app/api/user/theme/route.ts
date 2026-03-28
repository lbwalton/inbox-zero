import { NextResponse } from "next/server";
import prisma from "@/utils/prisma";
import { withAuth } from "@/utils/middleware";

const VALID_THEMES = ["light", "dark", "bright", "monochromatic", "earth"];

export const GET = withAuth(async (request) => {
  const userId = request.auth.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { themePreference: true },
  });

  return NextResponse.json({ theme: user?.themePreference ?? "light" });
});

export const PUT = withAuth(async (request) => {
  const userId = request.auth.userId;
  const body = await request.json();
  const { theme } = body;

  if (!theme || !VALID_THEMES.includes(theme)) {
    return NextResponse.json(
      {
        error: `Invalid theme. Must be one of: ${VALID_THEMES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { themePreference: theme },
    select: { themePreference: true },
  });

  return NextResponse.json({ theme: user.themePreference });
});
