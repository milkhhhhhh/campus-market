import { serializeImages } from "@campus/db";
import { RentalStatus } from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { toRentalItemDTO } from "@/lib/listing-dto";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import {
  handleRouteError,
  RouteError,
} from "@/lib/route-error";
import { updateRentalSchema } from "@/lib/schemas/listings";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
const include = { owner: true, category: true } as const;

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const rental = await prisma.$transaction(async (tx) => {
      const updated = await tx.rentalItem.updateMany({
        where: { id, rentalStatus: RentalStatus.AVAILABLE },
        data: { viewCount: { increment: 1 } },
      });
      if (updated.count === 0) return null;
      return tx.rentalItem.findUnique({ where: { id }, include });
    });
    if (!rental) {
      throw new RouteError("NOT_FOUND", "租借物品不存在", 404);
    }
    return ok(toRentalItemDTO(rental));
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
    const input = await validateJson(request, updateRentalSchema);
    const existing = await prisma.rentalItem.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new RouteError("NOT_FOUND", "租借物品不存在", 404);
    }
    if (existing.ownerId !== user.id) {
      throw new RouteError("FORBIDDEN", "无权修改该租借物品", 403);
    }
    if (existing.rentalStatus === RentalStatus.RENTED) {
      throw new RouteError(
        "RENTAL_STATUS_CONFLICT",
        "出租中的物品不能修改",
        409,
      );
    }
    const nextMinDays = input.minDays ?? existing.minDays;
    const nextMaxDays =
      input.maxDays === undefined ? existing.maxDays : input.maxDays;
    if (nextMaxDays !== null && nextMaxDays < nextMinDays) {
      throw new RouteError(
        "INVALID_RENTAL_PERIOD",
        "最大租期不能小于最小租期",
        422,
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
    const rental = await prisma.rentalItem.update({
      where: { id },
      data: {
        ...data,
        ...(images ? { images: serializeImages(images) } : {}),
      },
      include,
    });
    return ok(toRentalItemDTO(rental));
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
    const existing = await prisma.rentalItem.findUnique({
      where: { id },
      include,
    });
    if (!existing) {
      throw new RouteError("NOT_FOUND", "租借物品不存在", 404);
    }
    if (existing.ownerId !== user.id) {
      throw new RouteError("FORBIDDEN", "无权下架该租借物品", 403);
    }
    if (existing.rentalStatus === RentalStatus.RENTED) {
      throw new RouteError(
        "RENTAL_STATUS_CONFLICT",
        "出租中的物品不能下架",
        409,
      );
    }
    if (existing.rentalStatus === RentalStatus.OFF_SHELF) {
      return ok(toRentalItemDTO(existing));
    }

    const rental = await prisma.rentalItem.update({
      where: { id },
      data: { rentalStatus: RentalStatus.OFF_SHELF },
      include,
    });
    return ok(toRentalItemDTO(rental));
  } catch (error) {
    return handleRouteError(error);
  }
}
