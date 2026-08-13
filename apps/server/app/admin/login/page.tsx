import { LoginForm } from "@/components/admin/LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">管理后台登录</h1>
        <p className="mt-2 text-sm text-slate-500">
          开发环境默认账号 admin / admin123
        </p>
        <div className="mt-6">
          <LoginForm next={params.next} initialError={params.error} />
        </div>
      </div>
    </div>
  );
}
