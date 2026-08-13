"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAdmin } from "@/app/admin/actions/auth";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "商品" },
  { href: "/admin/rentals", label: "租借" },
  { href: "/admin/orders", label: "订单" },
  { href: "/admin/users", label: "用户" },
  { href: "/admin/reports", label: "举报" },
];

export function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 bg-slate-900 text-white md:block">
        <div className="border-b border-slate-700 px-6 py-5 text-lg font-semibold">
          Campus Market
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  active
                    ? "bg-slate-700 font-medium text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              管理后台
            </p>
            <p className="text-sm font-medium text-slate-900">{adminName}</p>
          </div>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              退出
            </button>
          </form>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
