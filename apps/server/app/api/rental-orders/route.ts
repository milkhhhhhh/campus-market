import type { Prisma } from "@campus/db";
import {
  RentalOrderStatus,
  RentalStatus,
} from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { paginated, paginationArgs } from "@/lib/listing-query";
import { toRentalOrderDTO } from "@/lib/order-dto";
import {
  calculateRentalDays,
  calculateRentalTotal,
  parseUtcDateOnly,
  reconcileOverdueRentalOrders,
  utcTodayStart,
} from "@/lib/order-state";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";
import {
  createRentalOrderSchema,
  rentalOrderListQuerySchema,
} from "@/lib/schemas/orders";
import { validateJson, validateQuery } from "@/lib/validate";

export const runtime = "nodejs";

const include = {
  rentalItem: { include: { owner: true, category: true } },
} as const;

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const query = validateQuery(request, rentalOrderListQuerySchema);

    const where: Prisma.RentalOrderWhereInput = {
      ...(query.role === "renter"
        ? { renterId: user.id }
        : { ownerId: user.id }),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, items] = await prisma.$transaction(async (tx) => {
      await reconcileOverdueRentalOrders(tx, user.id, query.role);
      return Promise.all([
        tx.rentalOrder.count({ where }),
        tx.rentalOrder.findMany({
          where,
          include,
          orderBy: { createdAt: "desc" },
          ...paginationArgs(query.page, query.pageSize),
        }),
      ]);
    });

    return ok(
      paginated(
        items.map(toRentalOrderDTO),
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
    const input = await validateJson(request, createRentalOrderSchema);

    const startDate = parseUtcDateOnly(input.startDate);
    const endDate = parseUtcDateOnly(input.endDate);
    const today = utcTodayStart();
    if (startDate.getTime() < today.getTime()) {
      throw new RouteError(
        "INVALID_RENTAL_PERIOD",
        "开始日期不能早于当前 UTC 日期",
        422,
      );
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new RouteError(
        "INVALID_RENTAL_PERIOD",
        "结束日期不能早于开始日期",
        422,
      );
    }

    const days = calculateRentalDays(startDate, endDate);

    const order = await prisma.$transaction(async (tx) => {
      const rentalItem = await tx.rentalItem.findUnique({
        where: { id: input.rentalItemId },
      });
      if (!rentalItem) {
        throw new RouteError("NOT_FOUND", "租借物品不存在", 404);
      }
      if (rentalItem.ownerId === user.id) {
        throw new RouteError(
          "CANNOT_RENT_OWN_ITEM",
          "不能租借自己的物品",
          422,
        );
      }
      if (rentalItem.rentalStatus !== RentalStatus.AVAILABLE) {
        throw new RouteError(
          "RENTAL_ITEM_NOT_AVAILABLE",
          "物品当前不可租借",
          409,
        );
      }
      if (days < rentalItem.minDays) {
        throw new RouteError(
          "INVALID_RENTAL_PERIOD",
          `租期不能少于 ${rentalItem.minDays} 天`,
          422,
        );
      }
      if (
        rentalItem.maxDays !== null &&
        days > rentalItem.maxDays
      ) {
        throw new RouteError(
          "INVALID_RENTAL_PERIOD",
          `租期不能超过 ${rentalItem.maxDays} 天`,
          422,
        );
      }

      const rented = await tx.rentalItem.updateMany({
        where: {
          id: input.rentalItemId,
          rentalStatus: RentalStatus.AVAILABLE,
        },
        data: { rentalStatus: RentalStatus.RENTED },
      });
      if (rented.count !== 1) {
        throw new RouteError(
          "RENTAL_ITEM_NOT_AVAILABLE",
          "物品当前不可租借",
          409,
        );
      }

      const totalAmount = calculateRentalTotal(
        rentalItem.dailyPrice,
        rentalItem.deposit,
        days,
      );

      return tx.rentalOrder.create({
        data: {
          rentalItemId: rentalItem.id,
          renterId: user.id,
          ownerId: rentalItem.ownerId,
          dailyPrice: rentalItem.dailyPrice,
          deposit: rentalItem.deposit,
          startDate,
          endDate,
          days,
          totalAmount,
          status: RentalOrderStatus.IN_USE,
        },
        include,
      });
    });

    return ok(toRentalOrderDTO(order), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
