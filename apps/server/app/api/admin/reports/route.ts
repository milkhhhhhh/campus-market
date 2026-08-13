import type { Prisma } from "@campus/db";

import { requireAdmin } from "@/lib/admin-auth";
import { getUserFromRequest } from "@/lib/auth";
import { paginated, paginationArgs } from "@/lib/listing-query";
import { toReportDTO } from "@/lib/report-dto";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError } from "@/lib/route-error";
import { reportListQuerySchema } from "@/lib/schemas/reports";
import { validateQuery } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    requireAdmin(user);
    const query = validateQuery(request, reportListQuerySchema);

    const where: Prisma.ReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, items] = await prisma.$transaction([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...paginationArgs(query.page, query.pageSize),
      }),
    ]);

    return ok(
      paginated(
        items.map(toReportDTO),
        total,
        query.page,
        query.pageSize,
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
