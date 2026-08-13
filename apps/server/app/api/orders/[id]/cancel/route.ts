import { OrderStatus, ProductStatus } from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { toOrderDTO } from "@/lib/order-dto";
import {
  assertTradeParticipant,
} from "@/lib/order-state";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const include = {
  product: { include: { seller: true, category: true } },
} as const;

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await getUserFromRequest(request);
    const { id } = await context.params;

    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { id },
        include,
      });
      if (!existing) {
        throw new RouteError("NOT_FOUND", "订单不存在", 404);
      }
      assertTradeParticipant(existing, user.id);

      const status = existing.status as OrderStatus;
      if (status === OrderStatus.CANCELLED) {
        return existing;
      }
      if (status !== OrderStatus.PENDING) {
        throw new RouteError(
          "ORDER_STATUS_CONFLICT",
          `订单当前状态为 ${status}，无法取消`,
          409,
        );
      }

      const updatedOrder = await tx.order.updateMany({
        where: { id, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });
      if (updatedOrder.count !== 1) {
        throw new RouteError(
          "ORDER_STATUS_CONFLICT",
          "订单状态已变更，无法取消",
          409,
        );
      }

      const updatedProduct = await tx.product.updateMany({
        where: {
          id: existing.productId,
          status: ProductStatus.LOCKED,
        },
        data: { status: ProductStatus.ON_SALE },
      });
      if (updatedProduct.count !== 1) {
        throw new RouteError(
          "ORDER_STATUS_CONFLICT",
          "商品状态异常，无法取消订单",
          409,
        );
      }

      const fresh = await tx.order.findUnique({
        where: { id },
        include,
      });
      if (!fresh) {
        throw new RouteError("NOT_FOUND", "订单不存在", 404);
      }
      return fresh;
    });

    return ok(toOrderDTO(order));
  } catch (error) {
    return handleRouteError(error);
  }
}
