import { Pagination } from "@/components/admin/Pagination";
import { offShelfProduct } from "@/app/admin/actions/listings";
import { formatMoney, listProducts } from "@/lib/admin/queries";
import { ProductStatus } from "@campus/shared";

const PAGE_SIZE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const result = await listProducts(page, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">商品管理</h1>
        <p className="mt-1 text-sm text-slate-500">全平台二手商品挂牌</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3">标题</th>
              <th className="px-5 py-3">卖家</th>
              <th className="px-5 py-3">价格</th>
              <th className="px-5 py-3">状态</th>
              <th className="px-5 py-3">发布时间</th>
              <th className="px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((product) => (
              <tr key={product.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-900">
                  {product.title}
                </td>
                <td className="px-5 py-3">{product.seller.nickname}</td>
                <td className="px-5 py-3">{formatMoney(product.price)}</td>
                <td className="px-5 py-3">{product.status}</td>
                <td className="px-5 py-3">
                  {product.createdAt.toLocaleString("zh-CN")}
                </td>
                <td className="px-5 py-3">
                  {product.status !== ProductStatus.OFF_SHELF ? (
                    <form action={offShelfProduct.bind(null, product.id)}>
                      <button
                        type="submit"
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        下架
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-slate-400">已下架</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath="/admin/products"
      />
    </div>
  );
}
