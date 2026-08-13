"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin-auth-server";
import { prisma } from "@/lib/prisma";
import { VerifyStatus } from "@campus/shared";

export async function verifyApprove(userId: string) {
  await requireAdminSession();
  await prisma.user.updateMany({
    where: { id: userId, verifyStatus: VerifyStatus.PENDING },
    data: { verifyStatus: VerifyStatus.APPROVED },
  });
  revalidatePath("/admin/users");
}

export async function verifyReject(userId: string) {
  await requireAdminSession();
  await prisma.user.updateMany({
    where: { id: userId, verifyStatus: VerifyStatus.PENDING },
    data: { verifyStatus: VerifyStatus.REJECTED },
  });
  revalidatePath("/admin/users");
}

export async function setBanned(userId: string, banned: boolean) {
  const admin = await requireAdminSession();
  if (admin.id === userId) {
    throw new Error("不能封禁当前登录的管理员账号");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { banned },
  });
  revalidatePath("/admin/users");
}
