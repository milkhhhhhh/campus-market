"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  CHAT,
  type ConversationListItemDTO,
  type ConversationListResponse,
} from "@campus/shared";

import { EmptyState } from "@/components/site/EmptyState";
import { ErrorState } from "@/components/site/ErrorState";
import { LoadingState } from "@/components/site/LoadingState";
import { siteRequest, SiteApiError } from "@/lib/site-api";
import { useSiteAuth } from "@/lib/site-auth";

export default function MessagesPage() {
  const { ready, requireLogin } = useSiteAuth();
  const [items, setItems] = useState<ConversationListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!requireLogin("/messages")) return;
    setLoading(true);
    try {
      const data = await siteRequest<ConversationListResponse>(
        CHAT.conversations,
        { query: { page: 1, pageSize: 50 } },
      );
      setItems(data.items);
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
    <div className="space-y-3">
      <h1 className="text-xl font-bold">消息</h1>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="加载失败" description={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState title="暂无会话" description="从商品详情联系卖家开始聊" />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {items.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className="flex items-center gap-3 border-b border-[#eef1f8] px-4 py-3 last:border-0"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--cm-surface-low)] font-bold text-[var(--cm-primary)]">
                {(c.peer.nickname || "?").slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold">{c.peer.nickname}</p>
                  <span className="shrink-0 text-xs text-[var(--cm-outline)]">
                    {c.lastMessageAt
                      ? new Date(c.lastMessageAt).toLocaleDateString()
                      : ""}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-[var(--cm-on-surface-variant)]">
                    {c.lastMessage || "暂无消息"}
                  </p>
                  {c.unreadCount > 0 ? (
                    <span className="rounded-full bg-rose-500 px-1.5 text-xs text-white">
                      {c.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
