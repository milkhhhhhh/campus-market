import { serializeImages, type Prisma } from "@campus/db";
import { RentalStatus } from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { toRentalItemDTO } from "@/lib/listing-dto";
import {
  paginated,
  paginationArgs,
  rentalOrderBy,
} from "@/lib/listing-query";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import {
  handleRouteError,
  RouteError,
} from "@/lib/route-error";
import {
  createRentalSchema,
  rentalListQuerySchema,
} from "@/lib/schemas/listings";
import { validateJson, validateQuery } from "@/lib/validate";

export const runtime = "nodejs";

const include = { owner: true, category: true } as const;

export async function GET(request: Request) {
  try {
    const query = validateQuery(request, rentalListQuerySchema);
    const where: Prisma.RentalItemWhereInput = {
      rentalStatus: RentalStatus.AVAILABLE,
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword } },
              { description: { contains: query.keyword } },
            ],
          }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.minDailyPrice !== undefined ||
      query.maxDailyPrice !== undefined
        ? {
            dailyPrice: {
              ...(query.minDailyPrice !== undefined
                ? { gte: query.minDailyPrice }
                : {}),
              ...(query.maxDailyPrice !== undefined
                ? { lte: query.maxDailyPrice }
                : {}),
            },
          }
        : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.rentalItem.count({ where }),
      prisma.rentalItem.findMany({
        where,
        include,
        orderBy: rentalOrderBy(query.sort),
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

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const input = await validateJson(request, createRentalSchema);
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new RouteError(
        "CATEGORY_NOT_FOUND",
        "所选分类不存在",
        422,
      );
    }

    const rental = await prisma.rentalItem.create({
      data: {
        ...input,
        images: serializeImages(input.images),
        ownerId: user.id,
        rentalStatus: RentalStatus.AVAILABLE,
      },
      include,
    });
    return ok(toRentalItemDTO(rental), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
