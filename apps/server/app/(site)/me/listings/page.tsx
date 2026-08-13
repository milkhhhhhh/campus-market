"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ListingType,
  PRODUCTS,
  RENTALS,
  type Paginated,
  type ProductDTO,
  type RentalItemDTO,
} from "@campus/shared";

import { EmptyState } from "@/components/site/EmptyState";
import { ErrorState } from "@/components/site/ErrorState";
import { LoadingState } from "@/components/site/LoadingState";
import {
  ProductCard,
  type SiteListingCard,
} from "@/components/site/ProductCard";
import { siteRequest, SiteApiError } from "@/lib/site-api";
import { useSiteAuth } from "@/lib/site-auth";

export default function MyListingsPage() {
  const { ready, requireLogin } = useSiteAuth();
  const [tab, setTab] = useState<"SALE" | "RENT">("SALE");
  const [items, setItems] = useState<SiteListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!requireLogin("/me/listings")) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === "SALE") {
        const data = await siteRequest<Paginated<ProductDTO>>(PRODUCTS.mine, {
          query: { page: 1, pageSize: 50 },
        });
        setItems(
          data.items.map((p) => ({
            id: p.id,
            title: p.title,
            image: p.images[0] ?? null,
            price: p.price,
            listingType: ListingType.SALE,
          })),
        );
      } else {
        const data = await siteRequest<Paginated<RentalItemDTO>>(RENTALS.mine, {
          query: { page: 1, pageSize: 50 },
        });
        setItems(
          data.items.map((r) => ({
            id: r.id,
            title: r.title,
            image: r.images[0] ?? null,
            price: r.dailyPrice,
            listingType: ListingType.RENT,
          })),
        );
      }
    } catch (e) {
      setError(e instanceof SiteApiError ? e.message : "加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [requireLogin, tab]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">我的发布</h1>
      <div className="flex gap-6 border-b border-[#eef1f8] bg-white px-2">
        {(
          [
            ["SALE", "二手"],
            ["RENT", "租借"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`py-3 text-sm ${
              tab === k
                ? "border-b-2 border-[var(--cm-primary)] font-bold text-[var(--cm-primary)]"
                : "text-[var(--cm-on-surface-variant)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="加载失败" description={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState title="暂无发布" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <ProductCard
              key={`${item.listingType}-${item.id}`}
              item={item}
            />
          ))}
        </div>
      )}
    </div>
  );
}
