import { NextResponse } from "next/server";

import { authenticateAdmin } from "@/lib/admin-auth-server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieOptions,
  signAdminSession,
} from "@/lib/admin-session";
import { fail, ok } from "@/lib/response";
import { handleRouteError } from "@/lib/route-error";

export const runtime = "nodejs";

async function loginAndBuildRedirect(
  username: string,
  password: string,
  next: string,
) {
  if (!username || !password) {
    return { error: "请输入账号和密码" as const, status: 422 as const };
  }

  const user = await authenticateAdmin(username, password);
  if (!user) {
    return { error: "账号或密码错误" as const, status: 401 as const };
  }

  const token = await signAdminSession(user.id);
  // Relative Location keeps the browser on the same host (localhost vs 127.0.0.1).
  const redirectTo = next.startsWith("/admin") ? next : "/admin";
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: redirectTo },
  });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    token,
    getAdminSessionCookieOptions(),
  );
  return { response, redirectTo, token };
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    // Progressive enhancement: plain HTML form POST (no JS).
    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      const username = String(formData.get("username") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const next = String(formData.get("next") ?? "").trim();
      const result = await loginAndBuildRedirect(
        username,
        password,
        next,
      );
      if ("response" in result) {
        return result.response;
      }
      return new NextResponse(null, {
        status: 303,
        headers: {
          Location: `/admin/login?error=${encodeURIComponent(result.error)}`,
        },
      });
    }

    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
      next?: unknown;
    };
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const next = String(body.next ?? "").trim();

    if (!username || !password) {
      return fail("VALIDATION_ERROR", "请输入账号和密码", 422);
    }

    const user = await authenticateAdmin(username, password);
    if (!user) {
      return fail("AUTH_INVALID", "账号或密码错误", 401);
    }

    const token = await signAdminSession(user.id);
    const redirectTo = next.startsWith("/admin") ? next : "/admin";
    const response = ok({ redirectTo });
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      token,
      getAdminSessionCookieOptions(),
    );
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
