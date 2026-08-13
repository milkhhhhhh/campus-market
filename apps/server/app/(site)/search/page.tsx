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
import {
  ProductCard,
  type SiteListingCard,
} from "@/components/site/ProductCard";
import { siteRequest, SiteApiError } from "@/lib/site-api";

type Kind = "ALL" | "SALE" | "RENT";

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [kind, setKind] = useState<Kind>("ALL");
  const [items, setItems] = useState<SiteListingCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!keyword.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cards: SiteListingCard[] = [];
      if (kind === "ALL" || kind === "SALE") {
        const data = await siteRequest<Paginated<ProductDTO>>(PRODUCTS.list, {
          auth: false,
          query: {
            page: 1,
            pageSize: 20,
            keyword: keyword.trim(),
            sort: "newest",
          },
        });
        cards.push(
          ...data.items.map((p) => ({
            id: p.id,
            title: p.title,
            image: p.images[0] ?? null,
            price: p.price,
            listingType: ListingType.SALE,
          })),
        );
      }
      if (kind === "ALL" || kind === "RENT") {
        const data = await siteRequest<Paginated<RentalItemDTO>>(RENTALS.list, {
          auth: false,
          query: {
            page: 1,
            pageSize: 20,
            keyword: keyword.trim(),
            sort: "newest",
          },
        });
        cards.push(
          ...data.items.map((r) => ({
            id: r.id,
            title: r.title,
            image: r.images[0] ?? null,
            price: r.dailyPrice,
            listingType: ListingType.RENT,
          })),
        );
      }
      setItems(cards);
    } catch (e) {
      setError(e instanceof SiteApiError ? e.message : "搜索失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, kind]);

  useEffect(() => {
    // reset when kind changes after a query
  }, [kind]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">搜索</h1>
      <div className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
          placeholder="输入关键词"
          className="flex-1 rounded-full border border-[#c3c6d7] bg-white px-4 py-2.5 text-sm outline-none focus:border-[var(--cm-primary-container)]"
        />
        <button
          type="button"
          onClick={() => void search()}
          className="rounded-full bg-[var(--cm-primary-container)] px-5 text-sm font-semibold text-white"
        >
          搜索
        </button>
      </div>
      <div className="flex gap-3 text-sm">
        {(
          [
            ["ALL", "全部"],
            ["SALE", "二手"],
            ["RENT", "租借"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={
              kind === k
                ? "border-b-2 border-[var(--cm-primary)] font-bold text-[var(--cm-primary)]"
                : "text-[var(--cm-on-surface-variant)]"
            }
          >
            {label}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--cm-outline)]">
          搜索中…
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          title={keyword ? "没有找到相关结果" : "输入关键词开始搜索"}
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
    </div>
  );
}
