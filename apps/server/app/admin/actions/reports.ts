"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin-auth-server";
import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@campus/shared";

const handleableStatuses = new Set<string>([
  ReportStatus.PENDING,
  ReportStatus.REVIEWING,
]);

export async function handleReport(
  reportId: string,
  action: "RESOLVED" | "DISMISSED",
  formData?: FormData,
) {
  const admin = await requireAdminSession();
  const targetStatus =
    action === "RESOLVED"
      ? ReportStatus.RESOLVED
      : ReportStatus.DISMISSED;
  const handleRemark = formData?.get("handleRemark")?.toString();

  const existing = await prisma.report.findUnique({
    where: { id: reportId },
  });
  if (!existing) {
    throw new Error("举报不存在");
  }
  if (existing.status === targetStatus) {
    return;
  }
  if (!handleableStatuses.has(existing.status)) {
    throw new Error(`举报当前状态为 ${existing.status}，无法处理`);
  }

  const updated = await prisma.report.updateMany({
    where: {
      id: reportId,
      status: { in: [...handleableStatuses] },
    },
    data: {
      status: targetStatus,
      handlerId: admin.id,
      handleRemark: handleRemark?.trim() || null,
    },
  });
  if (updated.count !== 1) {
    throw new Error("举报状态已变更，无法处理");
  }
  revalidatePath("/admin/reports");
}
