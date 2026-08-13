import type { Prisma } from "@campus/db";
import {
  ReportStatus,
  VerifyStatus,
  type AdminDashboardStats,
} from "@campus/shared";

import { paginated, paginationArgs } from "@/lib/listing-query";
import { prisma } from "@/lib/prisma";

export async function getDashboardStats(): Promise<AdminDashboardStats> {
  const [
    userCount,
    productCount,
    rentalCount,
    orderCount,
    pendingVerifyCount,
    pendingReportCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.rentalItem.count(),
    prisma.order.count(),
    prisma.user.count({ where: { verifyStatus: VerifyStatus.PENDING } }),
    prisma.report.count({
      where: {
        status: { in: [ReportStatus.PENDING, ReportStatus.REVIEWING] },
      },
    }),
  ]);

  return {
    userCount,
    productCount,
    rentalCount,
    orderCount,
    pendingVerifyCount,
    pendingReportCount,
  };
}

export async function getRecentOrders(limit = 10) {
  return prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { title: true } },
      buyer: { select: { nickname: true } },
      seller: { select: { nickname: true } },
    },
  });
}

export async function listProducts(page: number, pageSize: number) {
  const where: Prisma.ProductWhereInput = {};
  const [total, items] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { seller: { select: { nickname: true } } },
      orderBy: { createdAt: "desc" },
      ...paginationArgs(page, pageSize),
    }),
  ]);
  return paginated(items, total, page, pageSize);
}

export async function listRentals(page: number, pageSize: number) {
  const where: Prisma.RentalItemWhereInput = {};
  const [total, items] = await prisma.$transaction([
    prisma.rentalItem.count({ where }),
    prisma.rentalItem.findMany({
      where,
      include: { owner: { select: { nickname: true } } },
      orderBy: { createdAt: "desc" },
      ...paginationArgs(page, pageSize),
    }),
  ]);
  return paginated(items, total, page, pageSize);
}

export async function listTradeOrders(page: number, pageSize: number) {
  const [total, items] = await prisma.$transaction([
    prisma.order.count(),
    prisma.order.findMany({
      include: {
        product: { select: { title: true } },
        buyer: { select: { nickname: true } },
        seller: { select: { nickname: true } },
      },
      orderBy: { createdAt: "desc" },
      ...paginationArgs(page, pageSize),
    }),
  ]);
  return paginated(items, total, page, pageSize);
}

export async function listRentalOrders(page: number, pageSize: number) {
  const [total, items] = await prisma.$transaction([
    prisma.rentalOrder.count(),
    prisma.rentalOrder.findMany({
      include: {
        rentalItem: { select: { title: true } },
        renter: { select: { nickname: true } },
        owner: { select: { nickname: true } },
      },
      orderBy: { createdAt: "desc" },
      ...paginationArgs(page, pageSize),
    }),
  ]);
  return paginated(items, total, page, pageSize);
}

export async function listUsers(
  page: number,
  pageSize: number,
  filters?: {
    verifyStatus?: string;
    banned?: boolean;
  },
) {
  const where: Prisma.UserWhereInput = {
    ...(filters?.verifyStatus
      ? { verifyStatus: filters.verifyStatus }
      : {}),
    ...(filters?.banned !== undefined
      ? { banned: filters.banned }
      : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(page, pageSize),
    }),
  ]);
  return paginated(items, total, page, pageSize);
}

export async function listReports(
  page: number,
  pageSize: number,
  status?: string,
) {
  const where: Prisma.ReportWhereInput = {
    ...(status ? { status } : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(page, pageSize),
    }),
  ]);
  return paginated(items, total, page, pageSize);
}

function formatMoney(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

export { formatMoney };
