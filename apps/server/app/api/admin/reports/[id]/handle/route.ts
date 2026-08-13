import { ReportStatus } from "@campus/shared";

import { requireAdmin } from "@/lib/admin-auth";
import { getUserFromRequest } from "@/lib/auth";
import { toReportDTO } from "@/lib/report-dto";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";
import { handleReportSchema } from "@/lib/schemas/reports";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const handleableStatuses = new Set<string>([
  ReportStatus.PENDING,
  ReportStatus.REVIEWING,
]);

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await getUserFromRequest(request);
    requireAdmin(user);
    const { id } = await context.params;
    const input = await validateJson(request, handleReportSchema);
    const targetStatus =
      input.action === "RESOLVED"
        ? ReportStatus.RESOLVED
        : ReportStatus.DISMISSED;

    const report = await prisma.$transaction(async (tx) => {
      const existing = await tx.report.findUnique({ where: { id } });
      if (!existing) {
        throw new RouteError("NOT_FOUND", "举报不存在", 404);
      }
      if (existing.status === targetStatus) {
        return existing;
      }
      if (!handleableStatuses.has(existing.status)) {
        throw new RouteError(
          "REPORT_STATUS_CONFLICT",
          `举报当前状态为 ${existing.status}，无法处理`,
          409,
        );
      }

      const updated = await tx.report.updateMany({
        where: {
          id,
          status: { in: [...handleableStatuses] },
        },
        data: {
          status: targetStatus,
          handlerId: user.id,
          handleRemark: input.handleRemark ?? null,
        },
      });
      if (updated.count !== 1) {
        throw new RouteError(
          "REPORT_STATUS_CONFLICT",
          "举报状态已变更，无法处理",
          409,
        );
      }

      const fresh = await tx.report.findUnique({ where: { id } });
      if (!fresh) {
        throw new RouteError("NOT_FOUND", "举报不存在", 404);
      }
      return fresh;
    });

    return ok(toReportDTO(report));
  } catch (error) {
    return handleRouteError(error);
  }
}
