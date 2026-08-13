"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import {
  CATEGORIES,
  ListingType,
  PRODUCTS,
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

function findCategory(
  tree: CategoryTreeDTO[],
  id: string,
): CategoryTreeDTO | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findCategory(node.children, id);
    if (found) return found;
  }
  return null;
}

export default function CategoryPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const initialId = params.id;
  const initialName = search.get("name") ?? "分类";

  const [tab, setTab] = useState<"SALE" | "RENT">("SALE");
  const [tree, setTree] = useState<CategoryTreeDTO[]>([]);
  const [activeId, setActiveId] = useState(initialId);
  const [items, setItems] = useState<SiteListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeNode = useMemo(
    () => (activeId ? findCategory(tree, activeId) : null),
    [tree, activeId],
  );
  const children = activeNode?.children ?? [];
  const title = activeNode?.name ?? initialName;

  useEffect(() => {
    void siteRequest<CategoryTreeDTO[]>(CATEGORIES.list, { auth: false }).then(
      setTree,
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "SALE") {
        const data = await siteRequest<Paginated<ProductDTO>>(PRODUCTS.list, {
          auth: false,
          query: {
            page: 1,
            pageSize: 40,
            categoryId: activeId,
            sort: "newest",
          },
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
        const data = await siteRequest<Paginated<RentalItemDTO>>(RENTALS.list, {
          auth: false,
          query: {
            page: 1,
            pageSize: 40,
            categoryId: activeId,
            sort: "newest",
          },
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
  }, [activeId, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{title}</h1>
      {children.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveId(initialId)}
            className={`rounded-full px-3 py-1 text-sm ${
              activeId === initialId
                ? "bg-[var(--cm-primary-container)] text-white"
                : "border border-[#c3c6d7] bg-white"
            }`}
          >
            全部
          </button>
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={`rounded-full px-3 py-1 text-sm ${
                activeId === c.id
                  ? "bg-[var(--cm-primary-container)] text-white"
                  : "border border-[#c3c6d7] bg-white"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}
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
            className={`flex-1 rounded-xl py-2 text-sm ${
              tab === key ? "bg-white font-bold shadow-sm" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--cm-outline)]">
          加载中…
        </p>
      ) : items.length === 0 ? (
        <EmptyState title={`「${title}」暂无内容`} />
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
