"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { VerifyStatus } from "@campus/shared";

import { LoadingState } from "@/components/site/LoadingState";
import { useSiteAuth } from "@/lib/site-auth";

const VERIFY_LABEL: Record<VerifyStatus, string> = {
  [VerifyStatus.UNVERIFIED]: "未认证",
  [VerifyStatus.PENDING]: "审核中",
  [VerifyStatus.APPROVED]: "校园已认证",
  [VerifyStatus.REJECTED]: "认证未通过",
};

const MENUS = [
  { title: "校园认证", sub: "完成认证后更易成交", href: "/verify" },
  { title: "我的发布", sub: "管理在售与租借", href: "/me/listings" },
  { title: "我的收藏", sub: "感兴趣的好物", href: "/me/favorites" },
  { title: "我的订单", sub: "买到、卖出、租借", href: "/me/orders" },
  { title: "隐私政策", sub: "权限与数据说明", href: "/privacy" },
];

export default function MePage() {
  const router = useRouter();
  const { ready, user, logout, refreshProfile } = useSiteAuth();

  useEffect(() => {
    if (ready && user) void refreshProfile();
  }, [ready, user, refreshProfile]);

  if (!ready) {
    return <LoadingState />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-xl font-bold">未登录</p>
        <p className="text-sm text-[var(--cm-on-surface-variant)]">
          登录后管理订单与收藏
        </p>
        <Link
          href="/login?next=/me"
          className="mt-2 rounded-full bg-[var(--cm-primary-container)] px-8 py-2.5 font-semibold text-white"
        >
          去登录
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cm-surface-low)] text-xl font-bold text-[var(--cm-primary)]">
          {user.nickname.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{user.nickname}</h1>
          <span className="mt-1 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            {VERIFY_LABEL[user.verifyStatus]}
          </span>
          {user.school ? (
            <p className="mt-1 text-sm text-[var(--cm-on-surface-variant)]">
              {user.school}
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "我的发布", href: "/me/listings" },
          { label: "我的订单", href: "/me/orders" },
          { label: "我的收藏", href: "/me/favorites" },
        ].map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-2xl bg-white py-4 text-center shadow-sm"
          >
            <div className="font-bold text-[var(--cm-primary)]">查看</div>
            <div className="mt-1 text-xs text-[var(--cm-on-surface-variant)]">
              {s.label}
            </div>
          </Link>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {MENUS.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex items-center justify-between border-b border-[#eef1f8] px-4 py-4 last:border-0"
          >
            <div>
              <p className="font-medium">{m.title}</p>
              <p className="text-xs text-[var(--cm-outline)]">{m.sub}</p>
            </div>
            <span className="text-[var(--cm-outline)]">›</span>
          </Link>
        ))}
      </section>

      <button
        type="button"
        onClick={() => {
          logout();
          router.push("/");
        }}
        className="w-full rounded-2xl bg-red-50 py-3 font-semibold text-red-700"
      >
        退出登录
      </button>
    </div>
  );
}
