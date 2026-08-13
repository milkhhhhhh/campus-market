import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({
      status: "ok" as const,
      database: "connected" as const,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return fail(
      "SERVICE_UNAVAILABLE",
      "服务暂时不可用",
      503,
    );
  }
}
