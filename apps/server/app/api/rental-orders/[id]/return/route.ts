import {
  RentalOrderStatus,
  RentalStatus,
} from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { toRentalOrderDTO } from "@/lib/order-dto";
import {
  assertRentalOrderStatus,
  assertRentalRenter,
  reconcileOverdueRentalOrders,
} from "@/lib/order-state";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const include = {
  rentalItem: { include: { owner: true, category: true } },
} as const;

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await getUserFromRequest(request);
    const { id } = await context.params;

    const order = await prisma.$transaction(async (tx) => {
      await reconcileOverdueRentalOrders(tx, user.id, "renter");

      const existing = await tx.rentalOrder.findUnique({
        where: { id },
        include,
      });
      if (!existing) {
        throw new RouteError("NOT_FOUND", "租借订单不存在", 404);
      }
      assertRentalRenter(existing, user.id);
      assertRentalOrderStatus(
        existing.status as RentalOrderStatus,
        [RentalOrderStatus.IN_USE, RentalOrderStatus.OVERDUE],
        RentalOrderStatus.RETURNED,
      );
      if (existing.status === RentalOrderStatus.RETURNED) {
        return existing;
      }

      const updatedOrder = await tx.rentalOrder.updateMany({
        where: {
          id,
          status: {
            in: [
              RentalOrderStatus.IN_USE,
              RentalOrderStatus.OVERDUE,
            ],
          },
        },
        data: { status: RentalOrderStatus.RETURNED },
      });
      if (updatedOrder.count !== 1) {
        throw new RouteError(
          "RENTAL_ORDER_STATUS_CONFLICT",
          "租借订单状态已变更，无法归还",
          409,
        );
      }

      const updatedItem = await tx.rentalItem.updateMany({
        where: {
          id: existing.rentalItemId,
          rentalStatus: RentalStatus.RENTED,
        },
        data: { rentalStatus: RentalStatus.AVAILABLE },
      });
      if (updatedItem.count !== 1) {
        throw new RouteError(
          "RENTAL_ORDER_STATUS_CONFLICT",
          "物品状态异常，无法归还",
          409,
        );
      }

      const fresh = await tx.rentalOrder.findUnique({
        where: { id },
        include,
      });
      if (!fresh) {
        throw new RouteError("NOT_FOUND", "租借订单不存在", 404);
      }
      return fresh;
    });

    return ok(toRentalOrderDTO(order));
  } catch (error) {
    return handleRouteError(error);
  }
}
