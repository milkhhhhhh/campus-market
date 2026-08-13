import type { Report } from "@campus/db";
import { ReportStatus, type ReportDTO } from "@campus/shared";

export function toReportDTO(report: Report): ReportDTO {
  return {
    id: report.id,
    reporterId: report.reporterId,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    status: report.status as ReportStatus,
    handlerId: report.handlerId,
    handleRemark: report.handleRemark,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
