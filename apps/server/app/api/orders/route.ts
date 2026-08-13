import type { Prisma } from "@campus/db";
import { OrderStatus, ProductStatus } from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { paginated, paginationArgs } from "@/lib/listing-query";
import { toOrderDTO } from "@/lib/order-dto";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";
import {
  createOrderSchema,
  orderListQuerySchema,
} from "@/lib/schemas/orders";
import { validateJson, validateQuery } from "@/lib/validate";

export const runtime = "nodejs";

const include = {
  product: { include: { seller: true, category: true } },
} as const;

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const query = validateQuery(request, orderListQuerySchema);
    const where: Prisma.OrderWhereInput = {
      ...(query.role === "buyer"
        ? { buyerId: user.id }
        : { sellerId: user.id }),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, items] = await prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        ...paginationArgs(query.page, query.pageSize),
      }),
    ]);

    return ok(
      paginated(
        items.map(toOrderDTO),
        total,
        query.page,
        query.pageSize,
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const input = await validateJson(request, createOrderSchema);

    const order = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: input.productId },
      });
      if (!product) {
        throw new RouteError("NOT_FOUND", "商品不存在", 404);
      }
      if (product.sellerId === user.id) {
        throw new RouteError(
          "CANNOT_BUY_OWN_PRODUCT",
          "不能购买自己的商品",
          422,
        );
      }
      if (product.status !== ProductStatus.ON_SALE) {
        throw new RouteError(
          "PRODUCT_NOT_AVAILABLE",
          "商品当前不可购买",
          409,
        );
      }

      const locked = await tx.product.updateMany({
        where: {
          id: input.productId,
          status: ProductStatus.ON_SALE,
        },
        data: { status: ProductStatus.LOCKED },
      });
      if (locked.count !== 1) {
        throw new RouteError(
          "PRODUCT_NOT_AVAILABLE",
          "商品当前不可购买",
          409,
        );
      }

      return tx.order.create({
        data: {
          productId: product.id,
          buyerId: user.id,
          sellerId: product.sellerId,
          amount: product.price,
          status: OrderStatus.PENDING,
          remark: input.remark ?? null,
        },
        include,
      });
    });

    return ok(toOrderDTO(order), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
