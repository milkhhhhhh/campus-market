import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient 单例。
 * 开发环境下 Next.js/热重载会多次执行模块，使用 globalThis 缓存避免创建过多连接。
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * images 兼容工具：SQLite 无标量数组，images 以 JSON 字符串存储。
 * 切换到 PostgreSQL（String[]）后可移除这两个函数。
 */
export function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function serializeImages(images: string[] | null | undefined): string {
  return JSON.stringify(images ?? []);
}

export * from "@prisma/client";
