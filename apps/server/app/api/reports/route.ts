import { ReportStatus } from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { toReportDTO } from "@/lib/report-dto";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";
import { createReportSchema } from "@/lib/schemas/reports";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

async function assertReportTargetExists(
  targetType: string,
  targetId: string,
): Promise<void> {
  switch (targetType) {
    case "PRODUCT": {
      const product = await prisma.product.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!product) {
        throw new RouteError("NOT_FOUND", "被举报商品不存在", 404);
      }
      return;
    }
    case "RENTAL": {
      const rental = await prisma.rentalItem.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!rental) {
        throw new RouteError("NOT_FOUND", "被举报租借物品不存在", 404);
      }
      return;
    }
    case "USER": {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!targetUser) {
        throw new RouteError("NOT_FOUND", "被举报用户不存在", 404);
      }
      return;
    }
    case "MESSAGE": {
      const message = await prisma.message.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!message) {
        throw new RouteError("NOT_FOUND", "被举报消息不存在", 404);
      }
      return;
    }
    default:
      throw new RouteError(
        "INVALID_TARGET_TYPE",
        "不支持的举报对象类型",
        422,
      );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const input = await validateJson(request, createReportSchema);

    await assertReportTargetExists(input.targetType, input.targetId);

    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        status: ReportStatus.PENDING,
      },
    });

    return ok(toReportDTO(report), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
