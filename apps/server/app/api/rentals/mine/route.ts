import type { Prisma } from "@campus/db";

import { getUserFromRequest } from "@/lib/auth";
import { toRentalItemDTO } from "@/lib/listing-dto";
import {
  paginated,
  paginationArgs,
} from "@/lib/listing-query";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError } from "@/lib/route-error";
import { rentalMineQuerySchema } from "@/lib/schemas/listings";
import { validateQuery } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const query = validateQuery(request, rentalMineQuerySchema);
    const where: Prisma.RentalItemWhereInput = {
      ownerId: user.id,
      ...(query.status ? { rentalStatus: query.status } : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.rentalItem.count({ where }),
      prisma.rentalItem.findMany({
        where,
        include: { owner: true, category: true },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        ...paginationArgs(query.page, query.pageSize),
      }),
    ]);
    return ok(
      paginated(
        items.map(toRentalItemDTO),
        total,
        query.page,
        query.pageSize,
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
