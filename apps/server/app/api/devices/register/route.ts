import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError } from "@/lib/route-error";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

const registerDeviceSchema = z.strictObject({
  token: z.string().trim().min(8).max(512),
  platform: z.enum(["android", "ios", "web"]),
});

/**
 * 注册推送设备令牌。
 * 实际下发推送需配置 FCM/APNs；此处负责持久化 token。
 */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const input = await validateJson(request, registerDeviceSchema);

    const device = await prisma.deviceToken.upsert({
      where: {
        userId_token: {
          userId: user.id,
          token: input.token,
        },
      },
      update: {
        platform: input.platform,
      },
      create: {
        userId: user.id,
        token: input.token,
        platform: input.platform,
      },
      select: {
        id: true,
        platform: true,
        updatedAt: true,
      },
    });

    return ok({
      id: device.id,
      platform: device.platform,
      updatedAt: device.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
