import type { AuthTokenResult } from "@campus/shared";
import bcrypt from "bcryptjs";

import { AuthError, signAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clientIpFromRequest,
  rateLimit,
} from "@/lib/rate-limit";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";
import { passwordLoginSchema } from "@/lib/schemas/auth";
import { toUserDTO } from "@/lib/user-dto";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ip = clientIpFromRequest(request);
    const limited = rateLimit(`login:${ip}`, 30, 15 * 60 * 1000);
    if (!limited.ok) {
      throw new RouteError(
        "RATE_LIMITED",
        `登录尝试过多，请 ${limited.retryAfterSec} 秒后重试`,
        429,
      );
    }

    const input = await validateJson(request, passwordLoginSchema);
    const username = input.username.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user?.passwordHash) {
      throw new AuthError("INVALID_CREDENTIALS", "用户名或密码错误", 401);
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AuthError("INVALID_CREDENTIALS", "用户名或密码错误", 401);
    }

    if (user.banned) {
      throw new AuthError("USER_BANNED", "账号已被封禁", 403);
    }

    const result: AuthTokenResult = {
      token: signAccessToken(user),
      tokenType: "Bearer",
      user: toUserDTO(user),
    };
    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
