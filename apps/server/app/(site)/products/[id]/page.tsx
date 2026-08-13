"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  CHAT,
  FAVORITES,
  ListingType,
  ORDERS,
  PRODUCTS,
  ProductCondition,
  VerifyStatus,
  type ProductDTO,
} from "@campus/shared";

import { EmptyState } from "@/components/site/EmptyState";
import { formatPrice } from "@/lib/site-format";
import { siteRequest, SiteApiError } from "@/lib/site-api";
import { useSiteAuth } from "@/lib/site-auth";

const CONDITION_LABEL: Record<ProductCondition, string> = {
  [ProductCondition.NEW]: "全新",
  [ProductCondition.LIKE_NEW]: "几乎全新",
  [ProductCondition.GOOD]: "良好",
  [ProductCondition.FAIR]: "一般",
  [ProductCondition.POOR]: "较差",
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, requireLogin } = useSiteAuth();
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await siteRequest<ProductDTO>(PRODUCTS.detail(id), {
        auth: false,
      });
      setProduct(data);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = Boolean(user && product && user.id === product.sellerId);

  async function handleFavorite() {
    if (!product || !requireLogin(`/products/${id}`)) return;
    setBusy(true);
    try {
      const result = await siteRequest<{ favorited: boolean }>(
        FAVORITES.toggle,
        {
          method: "POST",
          data: { listingType: ListingType.SALE, targetId: product.id },
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
    if (!product || !requireLogin(`/products/${id}`)) return;
    if (isOwner) {
      setMsg("不能联系自己");
      return;
    }
    setBusy(true);
    try {
      const conv = await siteRequest<{ id: string }>(CHAT.conversations, {
        method: "POST",
        data: {
          peerId: product.sellerId,
          listingType: ListingType.SALE,
          listingId: product.id,
        },
      });
      router.push(`/chat/${conv.id}`);
    } catch (e) {
      setMsg(e instanceof SiteApiError ? e.message : "打开会话失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleBuy() {
    if (!product || !requireLogin(`/products/${id}`)) return;
    if (isOwner) {
      setMsg("不能购买自己的商品");
      return;
    }
    if (!window.confirm(`确认以 ${formatPrice(product.price)} 下单？`)) return;
    setBusy(true);
    try {
      await siteRequest(ORDERS.create, {
        method: "POST",
        data: { productId: product.id },
      });
      setMsg("下单成功");
      router.push("/me/orders?tab=buyer");
    } catch (e) {
      setMsg(e instanceof SiteApiError ? e.message : "下单失败");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="py-16 text-center text-sm text-[var(--cm-outline)]">加载中…</p>;
  }
  if (!product) {
    return <EmptyState title="商品不存在" description="可能已下架或链接无效" />;
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="overflow-hidden rounded-2xl bg-[var(--cm-surface-low)]">
        <div className="flex snap-x snap-mandatory overflow-x-auto">
          {(product.images.length ? product.images : [""]).map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="aspect-square w-full shrink-0 snap-center bg-[var(--cm-surface-low)]"
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold leading-snug">{product.title}</h1>
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--cm-primary)]">
            {CONDITION_LABEL[product.condition]}
          </span>
        </div>
        <p className="mt-3 text-2xl font-extrabold text-[var(--cm-primary)]">
          {formatPrice(product.price)}
        </p>
        <p className="mt-2 text-sm text-[var(--cm-outline)]">
          浏览 {product.viewCount} · 收藏 {product.favoriteCount}
          {product.category?.name ? ` · ${product.category.name}` : ""}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="font-bold">
          {product.seller?.nickname ?? "用户"}
          {product.seller?.verifyStatus === VerifyStatus.APPROVED ? " ✓" : ""}
        </p>
        <p className="mt-1 text-sm text-[var(--cm-outline)]">
          {product.seller?.verifyStatus === VerifyStatus.APPROVED
            ? "已认证学生卖家"
            : "校园用户"}
        </p>
        {isOwner ? (
          <p className="mt-2 text-sm text-[var(--cm-primary-container)]">我的发布</p>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold">商品描述</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--cm-on-surface-variant)]">
          {product.description}
        </p>
      </section>

      {msg ? <p className="text-center text-sm text-[var(--cm-primary)]">{msg}</p> : null}

      <div className="fixed bottom-0 left-0 right-0 border-t border-[#e4e9f7] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleFavorite()}
            className="w-16 text-center text-xs text-[var(--cm-on-surface-variant)]"
          >
            <div className="text-lg">{favorited ? "♥" : "♡"}</div>
            {favorited ? "已收藏" : "收藏"}
          </button>
          <button
            type="button"
            disabled={busy || isOwner}
            onClick={() => void handleContact()}
            className="flex-1 rounded-xl bg-[var(--cm-surface-high)] py-3 font-bold text-[var(--cm-primary)] disabled:opacity-50"
          >
            联系卖家
          </button>
          {!isOwner ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleBuy()}
              className="flex-1 rounded-xl bg-[var(--cm-primary)] py-3 font-bold text-white"
            >
              立即购买
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
