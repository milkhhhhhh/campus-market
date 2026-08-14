import {
  ProductCondition,
  ProductStatus,
  RentalStatus,
} from "@campus/shared";
import { z } from "zod";

import { imageRefSchema } from "@/lib/schemas/image-ref";

const page = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(20);
const optionalMoney = z.coerce
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER)
  .optional();
const sort = z
  .enum(["newest", "price_asc", "price_desc", "popular"])
  .default("newest");
const keyword = z.string().trim().min(1).max(100).optional();
const categoryId = z.string().trim().min(1).max(100);
const title = z.string().trim().min(1).max(100);
const description = z.string().trim().min(1).max(5_000);
const money = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);
const images = z.array(imageRefSchema).min(1).max(9);

export const productListQuerySchema = z
  .strictObject({
    page,
    pageSize,
    keyword,
    categoryId: categoryId.optional(),
    condition: z.nativeEnum(ProductCondition).optional(),
    minPrice: optionalMoney,
    maxPrice: optionalMoney,
    sort,
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    { message: "最低价格不能高于最高价格", path: ["minPrice"] },
  );

export const productMineQuerySchema = z.strictObject({
  page,
  pageSize,
  status: z.nativeEnum(ProductStatus).optional(),
});

export const createProductSchema = z.strictObject({
  title,
  description,
  price: money,
  condition: z.nativeEnum(ProductCondition),
  images,
  categoryId,
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "至少提供一个可修改字段",
  });

export const rentalListQuerySchema = z
  .strictObject({
    page,
    pageSize,
    keyword,
    categoryId: categoryId.optional(),
    minDailyPrice: optionalMoney,
    maxDailyPrice: optionalMoney,
    sort,
  })
  .refine(
    (value) =>
      value.minDailyPrice === undefined ||
      value.maxDailyPrice === undefined ||
      value.minDailyPrice <= value.maxDailyPrice,
    {
      message: "最低日租金不能高于最高日租金",
      path: ["minDailyPrice"],
    },
  );

export const rentalMineQuerySchema = z.strictObject({
  page,
  pageSize,
  status: z.nativeEnum(RentalStatus).optional(),
});

const rentalFields = {
  title,
  description,
  dailyPrice: money,
  deposit: money,
  minDays: z.number().int().min(1).max(365),
  maxDays: z.number().int().min(1).max(365).nullable().optional(),
  images,
  categoryId,
};

export const createRentalSchema = z
  .strictObject(rentalFields)
  .refine(
    (value) =>
      value.maxDays === undefined ||
      value.maxDays === null ||
      value.maxDays >= value.minDays,
    { message: "最大租期不能小于最小租期", path: ["maxDays"] },
  );

export const updateRentalSchema = z
  .strictObject(rentalFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "至少提供一个可修改字段",
  })
  .refine(
    (value) =>
      value.minDays === undefined ||
      value.maxDays === undefined ||
      value.maxDays === null ||
      value.maxDays >= value.minDays,
    { message: "最大租期不能小于最小租期", path: ["maxDays"] },
  );
