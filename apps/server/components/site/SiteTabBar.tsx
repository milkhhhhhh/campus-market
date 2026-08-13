"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "首页", icon: "⌂" },
  { href: "/publish", label: "发布", icon: "+" },
  { href: "/messages", label: "消息", icon: "☰" },
  { href: "/me", label: "我的", icon: "◎" },
] as const;

export function SiteTabBar() {
  const pathname = usePathname();

  // 登录 / 聊天等沉浸页隐藏底部栏
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/chat/") ||
    pathname.startsWith("/privacy")
  ) {
    return null;
  }

  return (
    <nav
      className="site-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-[#c3c6d7]/50 bg-white/95 backdrop-blur md:hidden"
      aria-label="主导航"
    >
      <div className="mx-auto flex h-14 max-w-5xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                active
                  ? "text-[var(--cm-primary)]"
                  : "text-[var(--cm-on-surface-variant)]"
              }`}
            >
              <span className="text-base leading-none" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
