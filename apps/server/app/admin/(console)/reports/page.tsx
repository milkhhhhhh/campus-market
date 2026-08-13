import Link from "next/link";

import { Pagination } from "@/components/admin/Pagination";
import { handleReport } from "@/app/admin/actions/reports";
import { listReports } from "@/lib/admin/queries";
import { ReportStatus } from "@campus/shared";

const PAGE_SIZE = 20;

const handleableStatuses = new Set<string>([
  ReportStatus.PENDING,
  ReportStatus.REVIEWING,
]);

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const result = await listReports(page, PAGE_SIZE, params.status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">举报管理</h1>
        <p className="mt-1 text-sm text-slate-500">处理用户提交的举报</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/reports"
          className={`rounded-lg px-3 py-1.5 text-sm ${
            !params.status
              ? "bg-slate-900 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          全部
        </Link>
        <Link
          href="/admin/reports?status=PENDING"
          className={`rounded-lg px-3 py-1.5 text-sm ${
            params.status === ReportStatus.PENDING
              ? "bg-slate-900 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          待处理
        </Link>
        <Link
          href={`/admin/reports?status=${ReportStatus.REVIEWING}`}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            params.status === ReportStatus.REVIEWING
              ? "bg-slate-900 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          审核中
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3">类型</th>
              <th className="px-5 py-3">目标 ID</th>
              <th className="px-5 py-3">原因</th>
              <th className="px-5 py-3">状态</th>
              <th className="px-5 py-3">提交时间</th>
              <th className="px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((report) => (
              <tr key={report.id} className="border-t border-slate-100">
                <td className="px-5 py-3">{report.targetType}</td>
                <td className="px-5 py-3 font-mono text-xs">
                  {report.targetId}
                </td>
                <td className="max-w-xs truncate px-5 py-3">{report.reason}</td>
                <td className="px-5 py-3">{report.status}</td>
                <td className="px-5 py-3">
                  {report.createdAt.toLocaleString("zh-CN")}
                </td>
                <td className="px-5 py-3">
                  {handleableStatuses.has(report.status) ? (
                    <div className="flex gap-2">
                      <form
                        action={handleReport.bind(
                          null,
                          report.id,
                          "RESOLVED",
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
                        >
                          成立
                        </button>
                      </form>
                      <form
                        action={handleReport.bind(
                          null,
                          report.id,
                          "DISMISSED",
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                        >
                          驳回
                        </button>
                      </form>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">已处理</span>
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
        basePath="/admin/reports"
        searchParams={{ status: params.status }}
      />
    </div>
  );
}
