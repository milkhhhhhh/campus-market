import type { AuthTokenResult } from "@campus/shared";
import { UserRole } from "@campus/shared";

import { AuthError, signAccessToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";
import { devLoginSchema } from "@/lib/schemas/auth";
import { toUserDTO } from "@/lib/user-dto";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new RouteError(
        "DEV_LOGIN_FORBIDDEN",
        "生产环境禁止开发登录",
        403,
      );
    }

    const input = await validateJson(request, devLoginSchema);
    const username = (input.username?.trim() || "web-demo-user").toLowerCase();
    const openId = `local_${username}`;

    const user = await prisma.user.upsert({
      where: { openId },
      update: {
        username,
      },
      create: {
        openId,
        username,
        nickname: username === "web-demo-user" ? "演示用户" : username,
        role: UserRole.STUDENT,
      },
    });

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
