import Link from "next/link";

import { Pagination } from "@/components/admin/Pagination";
import {
  setBanned,
  verifyApprove,
  verifyReject,
} from "@/app/admin/actions/users";
import { listUsers } from "@/lib/admin/queries";
import { VerifyStatus } from "@campus/shared";

const PAGE_SIZE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    verifyStatus?: string;
    banned?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const filters = {
    ...(params.verifyStatus ? { verifyStatus: params.verifyStatus } : {}),
    ...(params.banned === "true"
      ? { banned: true }
      : params.banned === "false"
        ? { banned: false }
        : {}),
  };
  const result = await listUsers(page, PAGE_SIZE, filters);

  const filterParams = {
    verifyStatus: params.verifyStatus,
    banned: params.banned,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">用户管理</h1>
        <p className="mt-1 text-sm text-slate-500">校园认证审核与账号封禁</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/users"
          className={`rounded-lg px-3 py-1.5 text-sm ${
            !params.verifyStatus && !params.banned
              ? "bg-slate-900 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          全部
        </Link>
        <Link
          href="/admin/users?verifyStatus=PENDING"
          className={`rounded-lg px-3 py-1.5 text-sm ${
            params.verifyStatus === VerifyStatus.PENDING
              ? "bg-slate-900 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          待审核
        </Link>
        <Link
          href="/admin/users?banned=true"
          className={`rounded-lg px-3 py-1.5 text-sm ${
            params.banned === "true"
              ? "bg-slate-900 text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          已封禁
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3">昵称</th>
              <th className="px-5 py-3">角色</th>
              <th className="px-5 py-3">认证</th>
              <th className="px-5 py-3">学校/学号</th>
              <th className="px-5 py-3">封禁</th>
              <th className="px-5 py-3">注册时间</th>
              <th className="px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-900">
                  {user.nickname}
                </td>
                <td className="px-5 py-3">{user.role}</td>
                <td className="px-5 py-3">{user.verifyStatus}</td>
                <td className="px-5 py-3">
                  {[user.school, user.studentId].filter(Boolean).join(" / ") ||
                    "—"}
                </td>
                <td className="px-5 py-3">
                  {user.banned ? "是" : "否"}
                </td>
                <td className="px-5 py-3">
                  {user.createdAt.toLocaleString("zh-CN")}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-2">
                    {user.verifyStatus === VerifyStatus.PENDING ? (
                      <>
                        <form action={verifyApprove.bind(null, user.id)}>
                          <button
                            type="submit"
                            className="rounded border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
                          >
                            通过
                          </button>
                        </form>
                        <form action={verifyReject.bind(null, user.id)}>
                          <button
                            type="submit"
                            className="rounded border border-amber-200 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                          >
                            驳回
                          </button>
                        </form>
                      </>
                    ) : null}
                    {user.role !== "ADMIN" ? (
                      <form
                        action={setBanned.bind(null, user.id, !user.banned)}
                      >
                        <button
                          type="submit"
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        >
                          {user.banned ? "解封" : "封禁"}
                        </button>
                      </form>
                    ) : null}
                  </div>
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
        basePath="/admin/users"
        searchParams={filterParams}
      />
    </div>
  );
}
