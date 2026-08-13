import type { Prisma, PrismaClient } from "@campus/db";
import {
  OrderStatus,
  RentalOrderStatus,
} from "@campus/shared";

import { RouteError } from "@/lib/route-error";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** 当前 UTC 自然日零点 */
export function utcTodayStart(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** 将 YYYY-MM-DD 解析为 UTC 零点 */
export function parseUtcDateOnly(value: string): Date {
  if (!DATE_ONLY.test(value)) {
    throw new RouteError(
      "INVALID_DATE",
      "日期格式必须为 YYYY-MM-DD",
      422,
    );
  }
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RouteError("INVALID_DATE", "日期无效", 422);
  }
  return date;
}

/** 租期天数（含首尾）：(end - start) / 86400000 + 1 */
export function calculateRentalDays(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    throw new RouteError(
      "INVALID_RENTAL_PERIOD",
      "结束日期不能早于开始日期",
      422,
    );
  }
  return Math.floor(diffMs / 86_400_000) + 1;
}

export function calculateRentFee(dailyPrice: number, days: number): number {
  return dailyPrice * days;
}

export function calculateRentalTotal(
  dailyPrice: number,
  deposit: number,
  days: number,
): number {
  return calculateRentFee(dailyPrice, days) + deposit;
}

export function assertTradeBuyer(
  order: { buyerId: string },
  userId: string,
): void {
  if (order.buyerId !== userId) {
    throw new RouteError("FORBIDDEN", "无权操作该订单", 403);
  }
}

export function assertTradeParticipant(
  order: { buyerId: string; sellerId: string },
  userId: string,
): void {
  if (order.buyerId !== userId && order.sellerId !== userId) {
    throw new RouteError("FORBIDDEN", "无权操作该订单", 403);
  }
}

export function assertRentalRenter(
  order: { renterId: string },
  userId: string,
): void {
  if (order.renterId !== userId) {
    throw new RouteError("FORBIDDEN", "无权操作该租借订单", 403);
  }
}

export function assertOrderStatus(
  current: OrderStatus,
  expected: OrderStatus,
  terminal: OrderStatus,
): void {
  if (current === terminal) return;
  if (current !== expected) {
    throw new RouteError(
      "ORDER_STATUS_CONFLICT",
      `订单当前状态为 ${current}，无法执行此操作`,
      409,
    );
  }
}

export function assertRentalOrderStatus(
  current: RentalOrderStatus,
  allowed: RentalOrderStatus[],
  terminal: RentalOrderStatus,
): void {
  if (current === terminal) return;
  if (!allowed.includes(current)) {
    throw new RouteError(
      "RENTAL_ORDER_STATUS_CONFLICT",
      `租借订单当前状态为 ${current}，无法执行此操作`,
      409,
    );
  }
}

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

function overdueWhere(userId: string, role: "renter" | "owner") {
  const today = utcTodayStart();
  return {
    status: RentalOrderStatus.IN_USE,
    endDate: { lt: today },
    ...(role === "renter" ? { renterId: userId } : { ownerId: userId }),
  } satisfies Prisma.RentalOrderWhereInput;
}

/** 惰性校准：将当前用户相关且已逾期的 IN_USE 订单更新为 OVERDUE */
export async function reconcileOverdueRentalOrders(
  tx: TransactionClient,
  userId: string,
  role: "renter" | "owner",
): Promise<void> {
  await tx.rentalOrder.updateMany({
    where: overdueWhere(userId, role),
    data: { status: RentalOrderStatus.OVERDUE },
  });
}
