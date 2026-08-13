import {
  ListingType,
  ProductStatus,
  RentalStatus,
} from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import {
  decrementProductFavoriteCount,
} from "@/lib/favorite-helpers";
import { toFavoriteDTO } from "@/lib/order-dto";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";
import { toggleFavoriteSchema } from "@/lib/schemas/orders";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const input = await validateJson(request, toggleFavoriteSchema);

    const result = await prisma.$transaction(async (tx) => {
      if (input.listingType === ListingType.SALE) {
        const product = await tx.product.findUnique({
          where: { id: input.targetId },
          select: { id: true, status: true },
        });
        if (!product) {
          throw new RouteError("NOT_FOUND", "商品不存在", 404);
        }
        if (product.status !== ProductStatus.ON_SALE) {
          throw new RouteError(
            "LISTING_NOT_FAVORITABLE",
            "仅可收藏在售商品",
            409,
          );
        }
      } else {
        const rentalItem = await tx.rentalItem.findUnique({
          where: { id: input.targetId },
          select: { id: true, rentalStatus: true },
        });
        if (!rentalItem) {
          throw new RouteError("NOT_FOUND", "租借物品不存在", 404);
        }
        if (rentalItem.rentalStatus !== RentalStatus.AVAILABLE) {
          throw new RouteError(
            "LISTING_NOT_FAVORITABLE",
            "仅可收藏可租物品",
            409,
          );
        }
      }

      const existing = await tx.favorite.findUnique({
        where: {
          userId_listingType_targetId: {
            userId: user.id,
            listingType: input.listingType,
            targetId: input.targetId,
          },
        },
      });

      if (existing) {
        await tx.favorite.delete({ where: { id: existing.id } });
        if (input.listingType === ListingType.SALE) {
          await decrementProductFavoriteCount(
            tx,
            input.targetId,
          );
        }
        return { favorited: false as const };
      }

      const favorite = await tx.favorite.create({
        data: {
          userId: user.id,
          listingType: input.listingType,
          targetId: input.targetId,
        },
      });
      if (input.listingType === ListingType.SALE) {
        await tx.product.update({
          where: { id: input.targetId },
          data: { favoriteCount: { increment: 1 } },
        });
      }
      return {
        favorited: true as const,
        favorite: toFavoriteDTO(favorite),
      };
    });

    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
