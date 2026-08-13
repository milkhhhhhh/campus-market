"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  CATEGORIES,
  ListingType,
  PRODUCTS,
  ProductCondition,
  RENTALS,
  type CategoryTreeDTO,
  type Paginated,
  type ProductDTO,
  type RentalItemDTO,
} from "@campus/shared";

import { EmptyState } from "@/components/site/EmptyState";
import {
  ProductCard,
  type SiteListingCard,
} from "@/components/site/ProductCard";
import { siteRequest, SiteApiError } from "@/lib/site-api";

type Tab = "SALE" | "RENT";

const CONDITION_BADGE: Partial<Record<ProductCondition, string>> = {
  [ProductCondition.NEW]: "全新",
  [ProductCondition.LIKE_NEW]: "几乎全新",
  [ProductCondition.GOOD]: "成色佳",
};

function mapProduct(p: ProductDTO): SiteListingCard {
  return {
    id: p.id,
    title: p.title,
    image: p.images[0] ?? null,
    price: p.price,
    listingType: ListingType.SALE,
    badge: CONDITION_BADGE[p.condition],
  };
}

function mapRental(r: RentalItemDTO): SiteListingCard {
  return {
    id: r.id,
    title: r.title,
    image: r.images[0] ?? null,
    price: r.dailyPrice,
    listingType: ListingType.RENT,
    badge: "可租借",
  };
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("SALE");
  const [categories, setCategories] = useState<CategoryTreeDTO[]>([]);
  const [items, setItems] = useState<SiteListingCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void siteRequest<CategoryTreeDTO[]>(CATEGORIES.list, { auth: false })
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      setLoading(true);
      setError(null);
      try {
        if (tab === "SALE") {
          const data = await siteRequest<Paginated<ProductDTO>>(PRODUCTS.list, {
            auth: false,
            query: { page: nextPage, pageSize: 20, sort: "newest" },
          });
          const mapped = data.items.map(mapProduct);
          setItems((prev) => (replace ? mapped : [...prev, ...mapped]));
          setHasMore(data.hasMore);
          setPage(nextPage);
        } else {
          const data = await siteRequest<Paginated<RentalItemDTO>>(
            RENTALS.list,
            {
              auth: false,
              query: { page: nextPage, pageSize: 20, sort: "newest" },
            },
          );
          const mapped = data.items.map(mapRental);
          setItems((prev) => (replace ? mapped : [...prev, ...mapped]));
          setHasMore(data.hasMore);
          setPage(nextPage);
        }
      } catch (e) {
        setError(e instanceof SiteApiError ? e.message : "加载失败");
        if (replace) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    void load(1, true);
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--cm-primary)]">
          校园集市
        </h1>
        <Link
          href="/search"
          className="mt-3 flex items-center gap-2 rounded-full bg-white px-4 py-3 text-[var(--cm-outline)] shadow-[0_4px_16px_rgba(11,28,48,0.06)]"
        >
          <span>⌕</span>
          <span>搜索教材、数码、单车…</span>
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {categories.map((c, i) => (
          <Link
            key={c.id}
            href={`/category/${c.id}?name=${encodeURIComponent(c.name)}`}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold ${
                i === 0
                  ? "bg-[var(--cm-primary-container)] text-white shadow-md shadow-blue-500/30"
                  : "bg-[var(--cm-surface-low)] text-[var(--cm-primary)]"
              }`}
            >
              {c.name.slice(0, 1)}
            </span>
            <span className="text-xs text-[var(--cm-on-surface-variant)]">
              {c.name}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex rounded-2xl bg-[var(--cm-surface-high)] p-1">
        {(
          [
            ["SALE", "二手"],
            ["RENT", "租借"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
              tab === key
                ? "bg-white font-bold shadow-sm"
                : "text-[var(--cm-on-surface-variant)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <button
          type="button"
          onClick={() => void load(1, true)}
          className="w-full rounded-xl bg-red-50 py-3 text-sm text-red-700"
        >
          {error}，点击重试
        </button>
      ) : null}

      {!loading && items.length === 0 ? (
        <EmptyState
          title={tab === "SALE" ? "暂无二手商品" : "暂无租借物品"}
          description="稍后再来看看"
        />
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

      {hasMore ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(page + 1, false)}
          className="w-full rounded-xl bg-white py-3 text-sm text-[var(--cm-outline)] shadow-sm"
        >
          {loading ? "加载中…" : "加载更多"}
        </button>
      ) : items.length > 0 ? (
        <p className="text-center text-sm text-[var(--cm-outline)]">
          没有更多了
        </p>
      ) : null}
    </div>
  );
}
