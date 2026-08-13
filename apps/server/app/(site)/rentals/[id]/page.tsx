"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  CHAT,
  FAVORITES,
  ListingType,
  RENTAL_ORDERS,
  RENTALS,
  VerifyStatus,
  type RentalItemDTO,
} from "@campus/shared";

import { EmptyState } from "@/components/site/EmptyState";
import { formatPrice } from "@/lib/site-format";
import { siteRequest, SiteApiError } from "@/lib/site-api";
import { useSiteAuth } from "@/lib/site-auth";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const a = new Date(start + "T00:00:00");
  const b = new Date(end + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export default function RentalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, requireLogin } = useSiteAuth();
  const [item, setItem] = useState<RentalItemDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await siteRequest<RentalItemDTO>(RENTALS.detail(id), {
        auth: false,
      });
      setItem(data);
    } catch {
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = Boolean(user && item && user.id === item.ownerId);

  const fee = useMemo(() => {
    if (!item) return null;
    const days = daysBetween(startDate, endDate);
    if (days < item.minDays) {
      return { error: `最短租期 ${item.minDays} 天`, days, total: 0, rent: 0 };
    }
    if (item.maxDays != null && days > item.maxDays) {
      return { error: `最长租期 ${item.maxDays} 天`, days, total: 0, rent: 0 };
    }
    if (days < 1) {
      return { error: "结束日期需不早于开始日期", days, total: 0, rent: 0 };
    }
    const rent = item.dailyPrice * days;
    return { error: null as string | null, days, rent, total: rent + item.deposit };
  }, [item, startDate, endDate]);

  async function handleFavorite() {
    if (!item || !requireLogin(`/rentals/${id}`)) return;
    setBusy(true);
    try {
      const result = await siteRequest<{ favorited: boolean }>(
        FAVORITES.toggle,
        {
          method: "POST",
          data: { listingType: ListingType.RENT, targetId: item.id },
        },
      );
      setFavorited(result.favorited);
      setMsg(result.favorited ? "已收藏" : "已取消收藏");
    } catch (e) {
      setMsg(e instanceof SiteApiError ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleContact() {
    if (!item || !requireLogin(`/rentals/${id}`)) return;
    if (isOwner) {
      setMsg("不能联系自己");
      return;
    }
    setBusy(true);
    try {
      const conv = await siteRequest<{ id: string }>(CHAT.conversations, {
        method: "POST",
        data: {
          peerId: item.ownerId,
          listingType: ListingType.RENT,
          listingId: item.id,
        },
      });
      router.push(`/chat/${conv.id}`);
    } catch (e) {
      setMsg(e instanceof SiteApiError ? e.message : "打开会话失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleRent() {
    if (!item || !requireLogin(`/rentals/${id}`) || !fee || fee.error) return;
    if (isOwner) {
      setMsg("不能租借自己的物品");
      return;
    }
    if (
      !window.confirm(
        `${fee.days} 天，合计 ${formatPrice(fee.total)}（含押金）？`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await siteRequest(RENTAL_ORDERS.create, {
        method: "POST",
        data: {
          rentalItemId: item.id,
          startDate,
          endDate,
        },
      });
      setMsg("下单成功");
      router.push("/me/orders?tab=renter");
    } catch (e) {
      setMsg(e instanceof SiteApiError ? e.message : "下单失败");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="py-16 text-center text-sm text-[var(--cm-outline)]">加载中…</p>;
  }
  if (!item) {
    return <EmptyState title="租借物品不存在" />;
  }

  const maxLabel = item.maxDays != null ? `${item.maxDays} 天` : "不限";

  return (
    <div className="space-y-4 pb-24">
      <div className="aspect-square overflow-hidden rounded-2xl bg-[var(--cm-surface-low)]">
        {item.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.images[0]}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold">{item.title}</h1>
        <p className="mt-3 text-2xl font-extrabold text-[var(--cm-primary)]">
          {formatPrice(item.dailyPrice)}
          <span className="ml-1 text-sm font-normal text-[var(--cm-outline)]">
            /天
          </span>
        </p>
        <p className="mt-2 text-sm text-[var(--cm-outline)]">
          押金 {formatPrice(item.deposit)} · 租期 {item.minDays}–{maxLabel} ·
          浏览 {item.viewCount}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">物品描述</h2>
        <p className="whitespace-pre-wrap text-sm text-[var(--cm-on-surface-variant)]">
          {item.description}
        </p>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-bold">选择租期</h2>
        <label className="flex items-center justify-between text-sm">
          <span>开始日期</span>
          <input
            type="date"
            value={startDate}
            min={today()}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-[#c3c6d7] px-2 py-1"
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>结束日期</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-[#c3c6d7] px-2 py-1"
          />
        </label>
        {fee ? (
          <div className="space-y-1 text-sm text-[var(--cm-on-surface-variant)]">
            <p>天数 {fee.days} 天</p>
            {!fee.error ? (
              <>
                <p>租金 {formatPrice(fee.rent)}</p>
                <p>押金 {formatPrice(item.deposit)}</p>
                <p className="font-bold text-[var(--cm-primary)]">
                  合计 {formatPrice(fee.total)}
                </p>
              </>
            ) : (
              <p className="text-red-600">{fee.error}</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="font-bold">
          {item.owner?.nickname ?? "用户"}
          {item.owner?.verifyStatus === VerifyStatus.APPROVED ? " · 已认证" : ""}
        </p>
      </section>

      {msg ? <p className="text-center text-sm text-[var(--cm-primary)]">{msg}</p> : null}

      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 px-4 py-3">
        <div className="mx-auto flex max-w-5xl gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleFavorite()}
            className="rounded-xl bg-[var(--cm-surface-high)] px-4 py-3 text-sm font-bold text-[var(--cm-primary)]"
          >
            {favorited ? "已收藏" : "收藏"}
          </button>
          <button
            type="button"
            disabled={busy || isOwner}
            onClick={() => void handleContact()}
            className="flex-1 rounded-xl bg-[var(--cm-surface-high)] py-3 font-bold text-[var(--cm-primary)]"
          >
            联系对方
          </button>
          {!isOwner ? (
            <button
              type="button"
              disabled={busy || Boolean(fee?.error)}
              onClick={() => void handleRent()}
              className="flex-[1.4] rounded-xl bg-[var(--cm-primary)] py-3 font-bold text-white disabled:opacity-50"
            >
              立即租借
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
