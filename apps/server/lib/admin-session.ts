import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

import { UserRole } from "@campus/shared";

export const ADMIN_SESSION_COOKIE = "campus_admin_session";
const JWT_ISSUER = "campus-admin";
const JWT_AUDIENCE = "campus-admin-console";
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7;

export interface AdminSessionPayload extends JWTPayload {
  sub: string;
  role: UserRole;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

function getMaxAge(): number {
  const configured = process.env.ADMIN_SESSION_MAX_AGE;
  if (!configured) return DEFAULT_MAX_AGE;
  const parsed = Number.parseInt(configured, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_AGE;
}

export async function signAdminSession(userId: string): Promise<string> {
  return new SignJWT({ role: UserRole.ADMIN })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(`${getMaxAge()}s`)
    .sign(getSecretKey());
}

export async function verifyAdminSession(
  token: string,
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (
      typeof payload.sub !== "string" ||
      payload.role !== UserRole.ADMIN
    ) {
      return null;
    }
    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getMaxAge(),
  };
}

export async function setAdminSessionCookie(userId: string): Promise<void> {
  const token = await signAdminSession(userId);
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, token, getAdminSessionCookieOptions());
}

export async function clearAdminSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
}

export async function getAdminSessionFromCookies(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}
