import { ReportStatus } from "@campus/shared";
import { z } from "zod";

const page = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(20);
const id = z.string().trim().min(1).max(100);

export const createReportSchema = z.strictObject({
  targetType: z.enum(["PRODUCT", "RENTAL", "USER", "MESSAGE"]),
  targetId: id,
  reason: z.string().trim().min(1).max(2_000),
});

export const reportListQuerySchema = z.strictObject({
  page,
  pageSize,
  status: z.nativeEnum(ReportStatus).optional(),
});

export const handleReportSchema = z.strictObject({
  action: z.enum(["RESOLVED", "DISMISSED"]),
  handleRemark: z.string().trim().max(2_000).optional(),
});
