/**
 * 推送发送占位：生产需接入 FCM（Android）/ APNs（iOS）。
 * 当前仅提供查询用户设备令牌与日志级发送钩子。
 */

import { prisma } from "@/lib/prisma";

export async function listUserDeviceTokens(userId: string) {
  return prisma.deviceToken.findMany({
    where: { userId },
    select: { token: true, platform: true },
  });
}

export async function notifyUserNewMessage(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<{ attempted: number; delivered: number }> {
  const tokens = await listUserDeviceTokens(userId);
  if (tokens.length === 0) {
    return { attempted: 0, delivered: 0 };
  }

  // TODO: 接入 FCM HTTP v1 / APNs。未配置时仅打日志，避免阻塞聊天主路径。
  if (process.env.NODE_ENV !== "production") {
    console.info("[push:stub]", {
      userId,
      devices: tokens.length,
      title: payload.title,
      body: payload.body,
    });
  }

  return { attempted: tokens.length, delivered: 0 };
}
