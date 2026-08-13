import { serializeImages, type Prisma } from "@campus/db";
import { ProductStatus } from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { toProductDTO } from "@/lib/listing-dto";
import {
  paginated,
  paginationArgs,
  productOrderBy,
} from "@/lib/listing-query";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import {
  handleRouteError,
  RouteError,
} from "@/lib/route-error";
import {
  createProductSchema,
  productListQuerySchema,
} from "@/lib/schemas/listings";
import { validateJson, validateQuery } from "@/lib/validate";

export const runtime = "nodejs";

const include = { seller: true, category: true } as const;

export async function GET(request: Request) {
  try {
    const query = validateQuery(request, productListQuerySchema);
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ON_SALE,
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword } },
              { description: { contains: query.keyword } },
            ],
          }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.condition ? { condition: query.condition } : {}),
      ...(query.minPrice !== undefined ||
      query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined
                ? { gte: query.minPrice }
                : {}),
              ...(query.maxPrice !== undefined
                ? { lte: query.maxPrice }
                : {}),
            },
          }
        : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include,
        orderBy: productOrderBy(query.sort),
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

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const input = await validateJson(request, createProductSchema);
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

    const product = await prisma.product.create({
      data: {
        ...input,
        images: serializeImages(input.images),
        sellerId: user.id,
        status: ProductStatus.ON_SALE,
      },
      include,
    });
    return ok(toProductDTO(product), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
