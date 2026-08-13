import { StatCard } from "@/components/admin/StatCard";
import { formatMoney, getDashboardStats, getRecentOrders } from "@/lib/admin/queries";

export default async function AdminDashboardPage() {
  const [stats, recentOrders] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(10),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">平台运营概览</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="用户总数" value={stats.userCount} />
        <StatCard label="商品总数" value={stats.productCount} />
        <StatCard label="租借物品" value={stats.rentalCount} />
        <StatCard label="交易订单" value={stats.orderCount} />
        <StatCard label="待审核认证" value={stats.pendingVerifyCount} />
        <StatCard label="待处理举报" value={stats.pendingReportCount} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-medium text-slate-900">最近订单</h2>
        </div>
        <div className="overflow-x-auto">
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
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="px-5 py-3">{order.product.title}</td>
                  <td className="px-5 py-3">{order.buyer.nickname}</td>
                  <td className="px-5 py-3">{order.seller.nickname}</td>
                  <td className="px-5 py-3">{formatMoney(order.amount)}</td>
                  <td className="px-5 py-3">{order.status}</td>
                  <td className="px-5 py-3">
                    {order.createdAt.toLocaleString("zh-CN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
