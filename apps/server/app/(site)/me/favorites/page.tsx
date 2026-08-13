"use client";

import { useCallback, useEffect, useState } from "react";

import {
  FAVORITES,
  ListingType,
  type FavoriteItemDTO,
  type Paginated,
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

function toCard(f: FavoriteItemDTO): SiteListingCard | null {
  if (f.listingType === ListingType.SALE && f.product) {
    return {
      id: f.product.id,
      title: f.product.title,
      image: f.product.images[0] ?? null,
      price: f.product.price,
      listingType: ListingType.SALE,
    };
  }
  if (f.listingType === ListingType.RENT && f.rentalItem) {
    return {
      id: f.rentalItem.id,
      title: f.rentalItem.title,
      image: f.rentalItem.images[0] ?? null,
      price: f.rentalItem.dailyPrice,
      listingType: ListingType.RENT,
    };
  }
  return null;
}

export default function FavoritesPage() {
  const { ready, requireLogin } = useSiteAuth();
  const [items, setItems] = useState<SiteListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!requireLogin("/me/favorites")) return;
    setLoading(true);
    try {
      const data = await siteRequest<Paginated<FavoriteItemDTO>>(FAVORITES.list, {
        query: { page: 1, pageSize: 50 },
      });
      setItems(
        data.items.map(toCard).filter((x): x is SiteListingCard => x != null),
      );
    } catch (e) {
      setError(e instanceof SiteApiError ? e.message : "加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [requireLogin]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">我的收藏</h1>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="加载失败" description={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState title="暂无收藏" />
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
