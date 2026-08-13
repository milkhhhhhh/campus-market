import type { PrismaClient } from "@campus/db";
import {
  ListingType,
  ProductStatus,
  RentalStatus,
} from "@campus/shared";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

async function decrementProductFavoriteCount(
  tx: TransactionClient,
  productId: string,
  amount = 1,
): Promise<void> {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { favoriteCount: true },
  });
  if (!product) return;
  await tx.product.update({
    where: { id: productId },
    data: {
      favoriteCount: Math.max(0, product.favoriteCount - amount),
    },
  });
}

/** 清理当前用户失效收藏；SALE 清理时同步递减商品 favoriteCount */
export async function cleanupStaleFavorites(
  tx: TransactionClient,
  userId: string,
  listingType?: ListingType,
): Promise<void> {
  const favorites = await tx.favorite.findMany({
    where: {
      userId,
      ...(listingType ? { listingType } : {}),
    },
  });
  if (favorites.length === 0) return;

  const saleIds = favorites
    .filter((f) => f.listingType === ListingType.SALE)
    .map((f) => f.targetId);
  const rentIds = favorites
    .filter((f) => f.listingType === ListingType.RENT)
    .map((f) => f.targetId);

  const [products, rentals] = await Promise.all([
    saleIds.length
      ? tx.product.findMany({
          where: { id: { in: saleIds } },
          select: { id: true, status: true },
        })
      : Promise.resolve([]),
    rentIds.length
      ? tx.rentalItem.findMany({
          where: { id: { in: rentIds } },
          select: { id: true, rentalStatus: true },
        })
      : Promise.resolve([]),
  ]);

  const validProductIds = new Set(
    products
      .filter((p) => p.status === ProductStatus.ON_SALE)
      .map((p) => p.id),
  );
  const validRentalIds = new Set(
    rentals
      .filter((r) => r.rentalStatus === RentalStatus.AVAILABLE)
      .map((r) => r.id),
  );

  const stale = favorites.filter((f) => {
    if (f.listingType === ListingType.SALE) {
      return !validProductIds.has(f.targetId);
    }
    return !validRentalIds.has(f.targetId);
  });
  if (stale.length === 0) return;

  await tx.favorite.deleteMany({
    where: { id: { in: stale.map((f) => f.id) } },
  });

  const staleSaleByProduct = new Map<string, number>();
  for (const favorite of stale) {
    if (favorite.listingType !== ListingType.SALE) continue;
    staleSaleByProduct.set(
      favorite.targetId,
      (staleSaleByProduct.get(favorite.targetId) ?? 0) + 1,
    );
  }
  for (const [productId, count] of staleSaleByProduct) {
    for (let i = 0; i < count; i += 1) {
      await decrementProductFavoriteCount(tx, productId);
    }
  }
}

export { decrementProductFavoriteCount };
