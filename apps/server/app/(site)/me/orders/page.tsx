"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ORDERS,
  OrderStatus,
  RENTAL_ORDERS,
  RentalOrderStatus,
  type OrderDTO,
  type Paginated,
  type RentalOrderDTO,
} from "@campus/shared";

import { EmptyState } from "@/components/site/EmptyState";
import { ErrorState } from "@/components/site/ErrorState";
import { LoadingState } from "@/components/site/LoadingState";
import { formatPrice } from "@/lib/site-format";
import { siteRequest, SiteApiError } from "@/lib/site-api";
import { useSiteAuth } from "@/lib/site-auth";

type Tab = "buyer" | "seller" | "renter" | "owner";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "buyer", label: "买到" },
  { key: "seller", label: "卖出" },
  { key: "renter", label: "租入" },
  { key: "owner", label: "租出" },
];

const ORDER_STATUS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: "待支付",
  [OrderStatus.PAID]: "已支付",
  [OrderStatus.SHIPPED]: "已发货",
  [OrderStatus.COMPLETED]: "已完成",
  [OrderStatus.CANCELLED]: "已取消",
  [OrderStatus.REFUNDING]: "退款中",
  [OrderStatus.REFUNDED]: "已退款",
};

const RENTAL_STATUS: Record<RentalOrderStatus, string> = {
  [RentalOrderStatus.PENDING]: "待支付",
  [RentalOrderStatus.PAID]: "已支付",
  [RentalOrderStatus.IN_USE]: "租用中",
  [RentalOrderStatus.RETURNED]: "已归还",
  [RentalOrderStatus.COMPLETED]: "已完成",
  [RentalOrderStatus.CANCELLED]: "已取消",
  [RentalOrderStatus.OVERDUE]: "已逾期",
};

function OrdersInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { ready, requireLogin } = useSiteAuth();
  const initial = (search.get("tab") as Tab) || "buyer";
  const [tab, setTab] = useState<Tab>(
    ["buyer", "seller", "renter", "owner"].includes(initial) ? initial : "buyer",
  );
  const [saleOrders, setSaleOrders] = useState<OrderDTO[]>([]);
  const [rentOrders, setRentOrders] = useState<RentalOrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!requireLogin("/me/orders")) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === "buyer" || tab === "seller") {
        const data = await siteRequest<Paginated<OrderDTO>>(ORDERS.list, {
          query: { page: 1, pageSize: 50, role: tab },
        });
        setSaleOrders(data.items);
        setRentOrders([]);
      } else {
        const role = tab === "renter" ? "renter" : "owner";
        const data = await siteRequest<Paginated<RentalOrderDTO>>(
          RENTAL_ORDERS.list,
          { query: { page: 1, pageSize: 50, role } },
        );
        setRentOrders(data.items);
        setSaleOrders([]);
      }
    } catch (e) {
      setError(e instanceof SiteApiError ? e.message : "加载失败");
      setSaleOrders([]);
      setRentOrders([]);
    } finally {
      setLoading(false);
    }
  }, [requireLogin, tab]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  function switchTab(next: Tab) {
    setTab(next);
    router.replace(`/me/orders?tab=${next}`);
  }

  async function actSale(id: string, action: "pay" | "complete" | "cancel") {
    setBusyId(id);
    try {
      const path =
        action === "pay"
          ? ORDERS.pay(id)
          : action === "complete"
            ? ORDERS.complete(id)
            : ORDERS.cancel(id);
      await siteRequest(path, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof SiteApiError ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  }

  async function actReturn(id: string) {
    setBusyId(id);
    try {
      await siteRequest(RENTAL_ORDERS.return(id), { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof SiteApiError ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">我的订单</h1>
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            className={`flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm ${
              tab === t.key
                ? "bg-[var(--cm-surface-low)] font-bold text-[var(--cm-primary)]"
                : "text-[var(--cm-on-surface-variant)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="加载失败" description={error} onRetry={() => void load()} />
      ) : tab === "buyer" || tab === "seller" ? (
        saleOrders.length === 0 ? (
          <EmptyState title="暂无订单" />
        ) : (
          <div className="space-y-3">
            {saleOrders.map((o) => (
              <div key={o.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="font-semibold">
                  {o.product?.title ?? `订单 ${o.id.slice(0, 8)}`}
                </p>
                <div className="mt-2 flex justify-between text-sm text-[var(--cm-on-surface-variant)]">
                  <span>{ORDER_STATUS[o.status] ?? o.status}</span>
                  <span className="font-bold text-[var(--cm-primary)]">
                    {formatPrice(o.amount)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--cm-outline)]">
                  {new Date(o.createdAt).toLocaleString()}
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  {tab === "buyer" && o.status === OrderStatus.PENDING ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => void actSale(o.id, "cancel")}
                        className="rounded-lg bg-[var(--cm-surface-high)] px-3 py-1.5 text-sm"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => void actSale(o.id, "pay")}
                        className="rounded-lg bg-[var(--cm-primary-container)] px-3 py-1.5 text-sm text-white"
                      >
                        付款
                      </button>
                    </>
                  ) : null}
                  {o.status === OrderStatus.PAID ? (
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => void actSale(o.id, "complete")}
                      className="rounded-lg bg-[var(--cm-primary-container)] px-3 py-1.5 text-sm text-white"
                    >
                      确认完成
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      ) : rentOrders.length === 0 ? (
        <EmptyState title="暂无租借订单" />
      ) : (
        <div className="space-y-3">
          {rentOrders.map((o) => (
            <div key={o.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-semibold">
                {o.rentalItem?.title ?? `租借 ${o.id.slice(0, 8)}`}
              </p>
              <div className="mt-2 flex justify-between text-sm">
                <span>{RENTAL_STATUS[o.status] ?? o.status}</span>
                <span className="font-bold text-[var(--cm-primary)]">
                  {formatPrice(o.totalAmount)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--cm-outline)]">
                {o.startDate} ~ {o.endDate} · {o.days} 天
              </p>
              {tab === "renter" &&
              (o.status === RentalOrderStatus.IN_USE ||
                o.status === RentalOrderStatus.OVERDUE) ? (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={busyId === o.id}
                    onClick={() => void actReturn(o.id)}
                    className="rounded-lg bg-[var(--cm-primary-container)] px-3 py-1.5 text-sm text-white"
                  >
                    归还
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center">加载中…</p>}>
      <OrdersInner />
    </Suspense>
  );
}
