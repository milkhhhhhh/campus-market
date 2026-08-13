import type { Prisma } from "@campus/db";
import type { ListingSort, Paginated } from "@campus/shared";

export function paginationArgs(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

export function productOrderBy(
  sort: ListingSort,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ price: "desc" }, { createdAt: "desc" }];
    case "popular":
      return [{ viewCount: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

export function rentalOrderBy(
  sort: ListingSort,
): Prisma.RentalItemOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ dailyPrice: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ dailyPrice: "desc" }, { createdAt: "desc" }];
    case "popular":
      return [{ viewCount: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}
