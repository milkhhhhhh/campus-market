import type { Prisma } from "@campus/db";

import { getUserFromRequest } from "@/lib/auth";
import { toProductDTO } from "@/lib/listing-dto";
import {
  paginated,
  paginationArgs,
} from "@/lib/listing-query";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError } from "@/lib/route-error";
import { productMineQuerySchema } from "@/lib/schemas/listings";
import { validateQuery } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const query = validateQuery(request, productMineQuerySchema);
    const where: Prisma.ProductWhereInput = {
      sellerId: user.id,
      ...(query.status ? { status: query.status } : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { seller: true, category: true },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        ...paginationArgs(query.page, query.pageSize),
      }),
    ]);
    return ok(
      paginated(
        items.map(toProductDTO),
        total,
        query.page,
        query.pageSize,
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
