"use server";

import { redirect } from "next/navigation";

import {
  clearAdminSessionCookie,
  setAdminSessionCookie,
} from "@/lib/admin-session";
import { authenticateAdmin } from "@/lib/admin-auth-server";

export async function loginAdmin(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!username || !password) {
    return { error: "请输入账号和密码" };
  }

  const user = await authenticateAdmin(username, password);
  if (!user) {
    return { error: "账号或密码错误" };
  }

  await setAdminSessionCookie(user.id);
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAdmin() {
  await clearAdminSessionCookie();
  redirect("/admin/login");
}
