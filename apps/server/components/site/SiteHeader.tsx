"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSiteAuth } from "@/lib/site-auth";

const NAV = [
  { href: "/", label: "首页" },
  { href: "/publish", label: "发布" },
  { href: "/messages", label: "消息" },
  { href: "/me", label: "我的" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useSiteAuth();

  if (pathname.startsWith("/login")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#c3c6d7]/40 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="text-lg font-extrabold text-[var(--cm-primary)]"
        >
          校园集市
        </Link>
        {/* 桌面导航；手机用底部 TabBar */}
        <nav className="hidden items-center gap-1 sm:gap-2 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--cm-surface-low)] text-[var(--cm-primary)]"
                    : "text-[var(--cm-on-surface-variant)] hover:bg-[var(--cm-surface-low)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {!user ? (
            <Link
              href="/login"
              className="ml-1 min-h-11 rounded-full bg-[var(--cm-primary-container)] px-3 py-2 text-sm font-semibold text-white"
            >
              登录
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          {!user ? (
            <Link
              href="/login"
              className="min-h-11 rounded-full bg-[var(--cm-primary-container)] px-3 py-2 text-sm font-semibold text-white"
            >
              登录
            </Link>
          ) : (
            <Link
              href="/search"
              className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-[var(--cm-primary)]"
            >
              搜索
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
