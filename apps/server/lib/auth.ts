import type { User } from "@campus/db";
import { UserRole } from "@campus/shared";
import jwt, { TokenExpiredError, type JwtPayload } from "jsonwebtoken";

import { prisma } from "@/lib/prisma";

const JWT_ALGORITHM = "HS256";
const JWT_ISSUER = "campus-market";
const JWT_AUDIENCE = "campus-market-api";
const JWT_EXPIRES_IN = "7d";

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
  return secret;
}

export function signAccessToken(user: {
  id: string;
  role: UserRole | string;
}): string {
  if (!Object.values(UserRole).includes(user.role as UserRole)) {
    throw new Error("Cannot sign a token with an unknown user role");
  }

  return jwt.sign(
    { role: user.role },
    getJwtSecret(),
    {
      algorithm: JWT_ALGORITHM,
      audience: JWT_AUDIENCE,
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      subject: user.id,
    },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: [JWT_ALGORITHM],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    });

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      !Object.values(UserRole).includes(payload.role as UserRole)
    ) {
      throw new AuthError("INVALID_TOKEN", "登录凭证无效");
    }

    return payload as AccessTokenPayload;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    if (error instanceof TokenExpiredError) {
      throw new AuthError("TOKEN_EXPIRED", "登录凭证已过期");
    }
    throw new AuthError("INVALID_TOKEN", "登录凭证无效");
  }
}

export function getBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  if (!match?.[1]) {
    throw new AuthError("AUTH_REQUIRED", "请先登录");
  }
  return match[1];
}

export async function getUserFromRequest(request: Request): Promise<User> {
  const payload = verifyAccessToken(getBearerToken(request));
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });

  if (!user) {
    throw new AuthError("USER_NOT_FOUND", "用户不存在");
  }
  if (user.banned) {
    throw new AuthError("USER_BANNED", "账号已被封禁", 403);
  }
  return user;
}
