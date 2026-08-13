import {
  ListingType,
  OrderStatus,
  RentalOrderStatus,
} from "@campus/shared";
import { z } from "zod";

const page = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(20);
const id = z.string().trim().min(1).max(100);
const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须为 YYYY-MM-DD");

export const createOrderSchema = z.strictObject({
  productId: id,
  remark: z.string().trim().max(500).optional(),
});

export const orderListQuerySchema = z.strictObject({
  page,
  pageSize,
  role: z.enum(["buyer", "seller"]),
  status: z.nativeEnum(OrderStatus).optional(),
});

export const createRentalOrderSchema = z.strictObject({
  rentalItemId: id,
  startDate: dateOnly,
  endDate: dateOnly,
});

export const rentalOrderListQuerySchema = z.strictObject({
  page,
  pageSize,
  role: z.enum(["renter", "owner"]),
  status: z.nativeEnum(RentalOrderStatus).optional(),
});

export const favoriteListQuerySchema = z.strictObject({
  page,
  pageSize,
  listingType: z.nativeEnum(ListingType).optional(),
});

export const toggleFavoriteSchema = z.strictObject({
  listingType: z.nativeEnum(ListingType),
  targetId: id,
});
