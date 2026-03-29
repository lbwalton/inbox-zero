import prisma from "@/utils/prisma";
import type { Prisma } from "@prisma/client";

export async function logAdminAction({
  action,
  adminUserId,
  targetUserId,
  metadata,
}: {
  action: string;
  adminUserId: string;
  targetUserId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      action,
      adminUserId,
      targetUserId: targetUserId ?? null,
      metadata: metadata ?? undefined,
    },
  });
}
