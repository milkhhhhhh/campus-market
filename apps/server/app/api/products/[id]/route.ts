import { serializeImages } from "@campus/db";
import { ProductStatus } from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { toProductDTO } from "@/lib/listing-dto";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import {
  handleRouteError,
  RouteError,
} from "@/lib/route-error";
import { updateProductSchema } from "@/lib/schemas/listings";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const include = { seller: true, category: true } as const;

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: { id, status: ProductStatus.ON_SALE },
        data: { viewCount: { increment: 1 } },
      });
      if (updated.count === 0) return null;
      return tx.product.findUnique({ where: { id }, include });
    });
    if (!product) {
      throw new RouteError("NOT_FOUND", "商品不存在", 404);
    }
    return ok(toProductDTO(product));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await getUserFromRequest(request);
    const { id } = await context.params;
    const input = await validateJson(request, updateProductSchema);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new RouteError("NOT_FOUND", "商品不存在", 404);
    }
    if (existing.sellerId !== user.id) {
      throw new RouteError("FORBIDDEN", "无权修改该商品", 403);
    }
    if (
      existing.status === ProductStatus.LOCKED ||
      existing.status === ProductStatus.SOLD
    ) {
      throw new RouteError(
        "PRODUCT_STATUS_CONFLICT",
        "当前状态不允许修改商品",
        409,
      );
    }
    if (input.categoryId) {
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
    }

    const { images, ...data } = input;
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(images ? { images: serializeImages(images) } : {}),
      },
      include,
    });
    return ok(toProductDTO(product));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await getUserFromRequest(request);
    const { id } = await context.params;
    const existing = await prisma.product.findUnique({
      where: { id },
      include,
    });
    if (!existing) {
      throw new RouteError("NOT_FOUND", "商品不存在", 404);
    }
    if (existing.sellerId !== user.id) {
      throw new RouteError("FORBIDDEN", "无权下架该商品", 403);
    }
    if (
      existing.status === ProductStatus.LOCKED ||
      existing.status === ProductStatus.SOLD
    ) {
      throw new RouteError(
        "PRODUCT_STATUS_CONFLICT",
        "当前状态不允许下架商品",
        409,
      );
    }
    if (existing.status === ProductStatus.OFF_SHELF) {
      return ok(toProductDTO(existing));
    }

    const product = await prisma.product.update({
      where: { id },
      data: { status: ProductStatus.OFF_SHELF },
      include,
    });
    return ok(toProductDTO(product));
  } catch (error) {
    return handleRouteError(error);
  }
}
