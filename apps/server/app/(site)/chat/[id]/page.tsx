"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import {
  CHAT,
  MessageType,
  UPLOAD,
  type MessageDTO,
  type MessageListResponse,
} from "@campus/shared";

import { LoadingState } from "@/components/site/LoadingState";
import { pickImages, useIsNativePlatform } from "@/lib/native";
import { siteRequest, SiteApiError } from "@/lib/site-api";
import { useSiteAuth } from "@/lib/site-auth";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, user, requireLogin } = useSiteAuth();
  const native = useIsNativePlatform();
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!requireLogin(`/chat/${id}`)) return;
    setLoading(true);
    try {
      const data = await siteRequest<MessageListResponse>(CHAT.messages(id), {
        query: { page: 1, pageSize: 100 },
      });
      setMessages(data.items);
    } catch (e) {
      setError(e instanceof SiteApiError ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [id, requireLogin]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendText() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      const msg = await siteRequest<MessageDTO>(CHAT.messages(id), {
        method: "POST",
        data: { type: MessageType.TEXT, content },
      });
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch (e) {
      setError(e instanceof SiteApiError ? e.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  async function sendImage(file: File | null) {
    if (!file || sending) return;
    setSending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const uploaded = await siteRequest<{ urls: string[] }>(UPLOAD.file, {
        method: "POST",
        formData: fd,
      });
      const url = uploaded.urls[0];
      if (!url) throw new SiteApiError("上传失败", "UPLOAD", 500);
      const msg = await siteRequest<MessageDTO>(CHAT.messages(id), {
        method: "POST",
        data: { type: MessageType.IMAGE, content: url },
      });
      setMessages((prev) => [...prev, msg]);
    } catch (e) {
      setError(e instanceof SiteApiError ? e.message : "发送图片失败");
    } finally {
      setSending(false);
    }
  }

  async function handlePickImage() {
    if (sending) return;
    const files = await pickImages(1);
    await sendImage(files[0] ?? null);
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col rounded-2xl bg-white shadow-sm">
      <div className="border-b px-4 py-3 font-bold">会话</div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {loading ? (
          <LoadingState label="加载消息…" />
        ) : (
          messages.map((m) => {
            const mine = user?.id === m.senderId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-[var(--cm-primary-container)] text-white"
                      : "bg-[var(--cm-surface-low)] text-[var(--cm-on-surface)]"
                  }`}
                >
                  {m.type === MessageType.IMAGE ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.content}
                      alt=""
                      className="max-h-48 rounded-lg"
                    />
                  ) : m.type === MessageType.STICKER ? (
                    <span>{m.content}</span>
                  ) : (
                    <span className="whitespace-pre-wrap break-words">
                      {m.content}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {error ? (
        <p className="px-4 text-center text-xs text-red-600">{error}</p>
      ) : null}
      <div className="flex items-center gap-2 border-t px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {native ? (
          <button
            type="button"
            disabled={sending}
            onClick={() => void handlePickImage()}
            className="min-h-11 rounded-lg bg-[var(--cm-surface-high)] px-3 py-2 text-sm text-[var(--cm-primary)]"
          >
            图片
          </button>
        ) : (
          <label className="min-h-11 cursor-pointer rounded-lg bg-[var(--cm-surface-high)] px-3 py-2 text-sm text-[var(--cm-primary)]">
            图片
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void sendImage(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendText();
            }
          }}
          placeholder="输入消息…"
          className="flex-1 rounded-full border border-[#c3c6d7] px-4 py-2 text-sm outline-none focus:border-[var(--cm-primary-container)]"
        />
        <button
          type="button"
          disabled={sending || !text.trim()}
          onClick={() => void sendText()}
          className="rounded-full bg-[var(--cm-primary-container)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  );
}
