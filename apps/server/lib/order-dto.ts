import type {
  Category,
  Favorite,
  Order,
  Product,
  RentalItem,
  RentalOrder,
  User,
} from "@campus/db";
import {
  ListingType,
  OrderStatus,
  RentalOrderStatus,
  type FavoriteDTO,
  type FavoriteItemDTO,
  type OrderDTO,
  type RentalOrderDTO,
} from "@campus/shared";

import { calculateRentFee } from "@/lib/order-state";
import {
  toProductDTO,
  toRentalItemDTO,
} from "@/lib/listing-dto";

type OrderWithRelations = Order & {
  product?: Product & { category?: Category; seller?: User };
};

type RentalOrderWithRelations = RentalOrder & {
  rentalItem?: RentalItem & { category?: Category; owner?: User };
};

export function toOrderDTO(order: OrderWithRelations): OrderDTO {
  return {
    id: order.id,
    productId: order.productId,
    ...(order.product ? { product: toProductDTO(order.product) } : {}),
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    amount: order.amount,
    status: order.status as OrderStatus,
    remark: order.remark,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toRentalOrderDTO(
  order: RentalOrderWithRelations,
): RentalOrderDTO {
  const rentFee = calculateRentFee(order.dailyPrice, order.days);
  return {
    id: order.id,
    rentalItemId: order.rentalItemId,
    ...(order.rentalItem
      ? { rentalItem: toRentalItemDTO(order.rentalItem) }
      : {}),
    renterId: order.renterId,
    ownerId: order.ownerId,
    dailyPrice: order.dailyPrice,
    deposit: order.deposit,
    startDate: order.startDate.toISOString(),
    endDate: order.endDate.toISOString(),
    days: order.days,
    rentFee,
    totalAmount: order.totalAmount,
    status: order.status as RentalOrderStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toFavoriteDTO(favorite: Favorite): FavoriteDTO {
  return {
    id: favorite.id,
    userId: favorite.userId,
    listingType: favorite.listingType as ListingType,
    targetId: favorite.targetId,
    createdAt: favorite.createdAt.toISOString(),
  };
}

export function toFavoriteItemDTO(
  favorite: Favorite,
  product?: Product & { category?: Category; seller?: User },
  rentalItem?: RentalItem & { category?: Category; owner?: User },
): FavoriteItemDTO {
  return {
    ...toFavoriteDTO(favorite),
    ...(product ? { product: toProductDTO(product) } : {}),
    ...(rentalItem ? { rentalItem: toRentalItemDTO(rentalItem) } : {}),
  };
}
