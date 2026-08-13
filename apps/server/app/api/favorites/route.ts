import type { Prisma } from "@campus/db";
import { ListingType } from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { cleanupStaleFavorites } from "@/lib/favorite-helpers";
import { paginated, paginationArgs } from "@/lib/listing-query";
import { toFavoriteItemDTO } from "@/lib/order-dto";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError } from "@/lib/route-error";
import { favoriteListQuerySchema } from "@/lib/schemas/orders";
import { validateQuery } from "@/lib/validate";

export const runtime = "nodejs";

const productInclude = {
  seller: true,
  category: true,
} as const;

const rentalInclude = {
  owner: true,
  category: true,
} as const;

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const query = validateQuery(request, favoriteListQuerySchema);

    const where: Prisma.FavoriteWhereInput = {
      userId: user.id,
      ...(query.listingType ? { listingType: query.listingType } : {}),
    };

    const [total, favorites] = await prisma.$transaction(async (tx) => {
      await cleanupStaleFavorites(
        tx,
        user.id,
        query.listingType,
      );
      return Promise.all([
        tx.favorite.count({ where }),
        tx.favorite.findMany({
          where,
          orderBy: { createdAt: "desc" },
          ...paginationArgs(query.page, query.pageSize),
        }),
      ]);
    });

    const saleIds = favorites
      .filter((f) => f.listingType === ListingType.SALE)
      .map((f) => f.targetId);
    const rentIds = favorites
      .filter((f) => f.listingType === ListingType.RENT)
      .map((f) => f.targetId);

    const [products, rentals] = await Promise.all([
      saleIds.length
        ? prisma.product.findMany({
            where: { id: { in: saleIds } },
            include: productInclude,
          })
        : Promise.resolve([]),
      rentIds.length
        ? prisma.rentalItem.findMany({
            where: { id: { in: rentIds } },
            include: rentalInclude,
          })
        : Promise.resolve([]),
    ]);

    const productById = new Map(products.map((p) => [p.id, p]));
    const rentalById = new Map(rentals.map((r) => [r.id, r]));

    const items = favorites.map((favorite) =>
      toFavoriteItemDTO(
        favorite,
        favorite.listingType === ListingType.SALE
          ? productById.get(favorite.targetId)
          : undefined,
        favorite.listingType === ListingType.RENT
          ? rentalById.get(favorite.targetId)
          : undefined,
      ),
    );

    return ok(
      paginated(items, total, query.page, query.pageSize),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
