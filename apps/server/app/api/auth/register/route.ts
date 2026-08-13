import type { AuthTokenResult } from "@campus/shared";
import { UserRole } from "@campus/shared";
import bcrypt from "bcryptjs";

import { signAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clientIpFromRequest,
  rateLimit,
} from "@/lib/rate-limit";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";
import { registerSchema } from "@/lib/schemas/auth";
import { toUserDTO } from "@/lib/user-dto";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
    if (!limited.ok) {
      throw new RouteError(
        "RATE_LIMITED",
        `注册过于频繁，请 ${limited.retryAfterSec} 秒后重试`,
        429,
      );
    }

    const input = await validateJson(request, registerSchema);
    const username = input.username.trim().toLowerCase();
    const openId = `local_${username}`;
    const nickname = input.nickname?.trim() || username;

    const userLimited = rateLimit(`register:user:${username}`, 3, 60 * 60 * 1000);
    if (!userLimited.ok) {
      throw new RouteError(
        "RATE_LIMITED",
        "该用户名注册尝试过多，请稍后再试",
        429,
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { openId }],
      },
    });
    if (existing) {
      throw new RouteError("USERNAME_TAKEN", "用户名已被占用", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        openId,
        username,
        nickname,
        passwordHash,
        role: UserRole.STUDENT,
      },
    });

    const result: AuthTokenResult = {
      token: signAccessToken(user),
      tokenType: "Bearer",
      user: toUserDTO(user),
    };
    return ok(result, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
