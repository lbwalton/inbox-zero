import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/utils/prisma";
import { type RequestWithAuth, withAuth } from "@/utils/middleware";

const patchAliasSchema = z.object({
  resolvedEmail: z.string().email().optional(),
  resolvedName: z.string().nullable().optional(),
});

export type PatchAliasBody = z.infer<typeof patchAliasSchema>;

async function getAliasForUser(id: string, userId: string) {
  return prisma.contactAlias.findFirst({
    where: { id, userId },
  });
}

/**
 * DELETE /api/alias/:id — delete a stored alias
 */
export const DELETE = withAuth(
  async (
    request: RequestWithAuth,
    { params }: { params: Promise<Record<string, string>> },
  ) => {
    const userId = request.auth.userId;
    const { id } = await params;

    const alias = await getAliasForUser(id, userId);
    if (!alias) {
      return NextResponse.json(
        { error: "Alias not found", isKnownError: true },
        { status: 404 },
      );
    }

    await prisma.contactAlias.delete({ where: { id } });

    return NextResponse.json({ deleted: true });
  },
);

/**
 * PATCH /api/alias/:id — update an alias to point to a different contact
 */
export const PATCH = withAuth(
  async (
    request: RequestWithAuth,
    { params }: { params: Promise<Record<string, string>> },
  ) => {
    const userId = request.auth.userId;
    const { id } = await params;
    const body = await request.json();
    const parsed = patchAliasSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const data = parsed.data;

    const alias = await getAliasForUser(id, userId);
    if (!alias) {
      return NextResponse.json(
        { error: "Alias not found", isKnownError: true },
        { status: 404 },
      );
    }

    const updated = await prisma.contactAlias.update({
      where: { id },
      data: {
        ...(data.resolvedEmail !== undefined && {
          resolvedEmail: data.resolvedEmail,
        }),
        ...(data.resolvedName !== undefined && {
          resolvedName: data.resolvedName,
        }),
      },
    });

    return NextResponse.json(updated);
  },
);
