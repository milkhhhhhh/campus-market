import {
  parseImages,
  type Category,
  type Product,
  type RentalItem,
  type User,
} from "@campus/db";
import {
  ProductCondition,
  ProductStatus,
  RentalStatus,
  VerifyStatus,
  type CategoryDTO,
  type CategoryTreeDTO,
  type ProductDTO,
  type RentalItemDTO,
  type UserSummaryDTO,
} from "@campus/shared";

type ProductWithRelations = Product & {
  category?: Category;
  seller?: User;
};

type RentalWithRelations = RentalItem & {
  category?: Category;
  owner?: User;
};

export function toCategoryDTO(category: Category): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    parentId: category.parentId,
    sort: category.sort,
    icon: category.icon,
  };
}

function toUserSummaryDTO(user: User): UserSummaryDTO {
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    verifyStatus: user.verifyStatus as VerifyStatus,
  };
}

function compareCategories(
  a: CategoryTreeDTO,
  b: CategoryTreeDTO,
): number {
  return a.sort - b.sort || a.name.localeCompare(b.name, "zh-CN");
}

export function toCategoryTree(
  categories: Category[],
): CategoryTreeDTO[] {
  const parentById = new Map(
    categories.map((category) => [category.id, category.parentId]),
  );
  const nodes = new Map<string, CategoryTreeDTO>(
    categories.map((category) => [
      category.id,
      { ...toCategoryDTO(category), children: [] },
    ]),
  );
  const roots: CategoryTreeDTO[] = [];

  const createsCycle = (id: string, parentId: string): boolean => {
    const visited = new Set<string>([id]);
    let cursor: string | null | undefined = parentId;
    while (cursor) {
      if (visited.has(cursor)) return true;
      visited.add(cursor);
      cursor = parentById.get(cursor);
    }
    return false;
  };

  for (const category of categories) {
    const node = nodes.get(category.id);
    if (!node) continue;
    const parent = category.parentId
      ? nodes.get(category.parentId)
      : undefined;
    if (
      parent &&
      category.parentId &&
      !createsCycle(category.id, category.parentId)
    ) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortTree = (items: CategoryTreeDTO[]) => {
    items.sort(compareCategories);
    for (const item of items) sortTree(item.children);
  };
  sortTree(roots);
  return roots;
}

export function toProductDTO(product: ProductWithRelations): ProductDTO {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    condition: product.condition as ProductCondition,
    status: product.status as ProductStatus,
    images: parseImages(product.images),
    categoryId: product.categoryId,
    sellerId: product.sellerId,
    ...(product.seller
      ? { seller: toUserSummaryDTO(product.seller) }
      : {}),
    ...(product.category
      ? { category: toCategoryDTO(product.category) }
      : {}),
    viewCount: product.viewCount,
    favoriteCount: product.favoriteCount,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export function toRentalItemDTO(
  rental: RentalWithRelations,
): RentalItemDTO {
  return {
    id: rental.id,
    title: rental.title,
    description: rental.description,
    dailyPrice: rental.dailyPrice,
    deposit: rental.deposit,
    minDays: rental.minDays,
    maxDays: rental.maxDays,
    rentalStatus: rental.rentalStatus as RentalStatus,
    images: parseImages(rental.images),
    categoryId: rental.categoryId,
    ownerId: rental.ownerId,
    ...(rental.owner ? { owner: toUserSummaryDTO(rental.owner) } : {}),
    ...(rental.category
      ? { category: toCategoryDTO(rental.category) }
      : {}),
    viewCount: rental.viewCount,
    createdAt: rental.createdAt.toISOString(),
    updatedAt: rental.updatedAt.toISOString(),
  };
}
