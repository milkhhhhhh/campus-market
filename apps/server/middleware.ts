import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import { UserRole } from "@campus/shared";

const ADMIN_SESSION_COOKIE = "campus_admin_session";
const JWT_ISSUER = "campus-admin";
const JWT_AUDIENCE = "campus-admin-console";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

async function isValidAdminSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return (
      typeof payload.sub === "string" &&
      payload.role === UserRole.ADMIN
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (pathname === "/admin/login") {
    if (token && (await isValidAdminSession(token))) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!token || !(await isValidAdminSession(token))) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
