import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import {
  getAdminSessionFromCookies,
} from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@campus/shared";

export async function authenticateAdmin(
  username: string,
  password: string,
) {
  const user = await prisma.user.findFirst({
    where: {
      adminUsername: username,
      role: UserRole.ADMIN,
      banned: false,
    },
  });
  if (!user?.passwordHash) {
    return null;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return user;
}

export async function requireAdminSession() {
  const session = await getAdminSessionFromCookies();
  if (!session?.sub) {
    redirect("/admin/login");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
  });
  if (
    !user ||
    user.role !== UserRole.ADMIN ||
    user.banned
  ) {
    redirect("/admin/login");
  }
  return user;
}

export async function getOptionalAdminSession() {
  const session = await getAdminSessionFromCookies();
  if (!session?.sub) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
  });
  if (
    !user ||
    user.role !== UserRole.ADMIN ||
    user.banned
  ) {
    return null;
  }
  return user;
}
