import Link from "next/link";

import { Pagination } from "@/components/admin/Pagination";
import {
  formatMoney,
  listRentalOrders,
  listTradeOrders,
} from "@/lib/admin/queries";

const PAGE_SIZE = 20;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const tab = params.tab === "rental" ? "rental" : "trade";

  const result =
    tab === "rental"
      ? await listRentalOrders(page, PAGE_SIZE)
      : await listTradeOrders(page, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">订单管理</h1>
        <p className="mt-1 text-sm text-slate-500">交易订单与租借订单</p>
      </div>

      <div className="flex gap-2">
        <Link
          href="/admin/orders?tab=trade"
          className={`rounded-lg px-4 py-2 text-sm ${
            tab === "trade"
              ? "bg-slate-900 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          交易订单
        </Link>
        <Link
          href="/admin/orders?tab=rental"
          className={`rounded-lg px-4 py-2 text-sm ${
            tab === "rental"
              ? "bg-slate-900 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          租借订单
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {tab === "trade" ? (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3">商品</th>
                <th className="px-5 py-3">买家</th>
                <th className="px-5 py-3">卖家</th>
                <th className="px-5 py-3">金额</th>
                <th className="px-5 py-3">状态</th>
                <th className="px-5 py-3">时间</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((order) => {
                const trade = order as Awaited<
                  ReturnType<typeof listTradeOrders>
                >["items"][number];
                return (
                  <tr key={trade.id} className="border-t border-slate-100">
                    <td className="px-5 py-3">{trade.product.title}</td>
                    <td className="px-5 py-3">{trade.buyer.nickname}</td>
                    <td className="px-5 py-3">{trade.seller.nickname}</td>
                    <td className="px-5 py-3">{formatMoney(trade.amount)}</td>
                    <td className="px-5 py-3">{trade.status}</td>
                    <td className="px-5 py-3">
                      {trade.createdAt.toLocaleString("zh-CN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3">物品</th>
                <th className="px-5 py-3">租客</th>
                <th className="px-5 py-3">出租方</th>
                <th className="px-5 py-3">总额</th>
                <th className="px-5 py-3">状态</th>
                <th className="px-5 py-3">时间</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((order) => {
                const rental = order as Awaited<
                  ReturnType<typeof listRentalOrders>
                >["items"][number];
                return (
                  <tr key={rental.id} className="border-t border-slate-100">
                    <td className="px-5 py-3">{rental.rentalItem.title}</td>
                    <td className="px-5 py-3">{rental.renter.nickname}</td>
                    <td className="px-5 py-3">{rental.owner.nickname}</td>
                    <td className="px-5 py-3">
                      {formatMoney(rental.totalAmount)}
                    </td>
                    <td className="px-5 py-3">{rental.status}</td>
                    <td className="px-5 py-3">
                      {rental.createdAt.toLocaleString("zh-CN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/admin/orders"
        searchParams={{ tab }}
      />
    </div>
  );
}
