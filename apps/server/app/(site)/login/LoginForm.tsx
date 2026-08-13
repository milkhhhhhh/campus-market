"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SiteApiError } from "@/lib/site-api";
import { useSiteAuth } from "@/lib/site-auth";

type Mode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { loginWithPassword, register, devLogin, isDev } = useSiteAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goNext() {
    const next = search.get("next") || "/";
    router.replace(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        await loginWithPassword(username, password);
      } else {
        await register(username, password, nickname || undefined);
      }
      goNext();
    } catch (err) {
      setError(err instanceof SiteApiError ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDevLogin() {
    setLoading(true);
    setError(null);
    try {
      await devLogin();
      goNext();
    } catch (err) {
      setError(err instanceof SiteApiError ? err.message : "开发登录失败");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-2xl border border-[#c3c6d7] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--cm-primary-container)]";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center">
      <h1 className="text-center text-4xl font-extrabold text-[var(--cm-primary)]">
        校园集市
      </h1>
      <p className="mt-2 text-center text-[var(--cm-on-surface-variant)]">
        网页 / App 账号登录
      </p>

      <div className="mt-8 flex rounded-2xl bg-[var(--cm-surface-high)] p-1">
        {(
          [
            ["login", "登录"],
            ["register", "注册"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
              mode === key
                ? "bg-white font-bold shadow-sm"
                : "text-[var(--cm-on-surface-variant)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-3">
        <input
          className={field}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名（字母数字等）"
          autoComplete="username"
          required
        />
        {mode === "register" ? (
          <input
            className={field}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="昵称（可选）"
          />
        ) : null}
        <input
          className={field}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={
            mode === "register"
              ? "密码（至少 8 位，含字母和数字）"
              : "密码"
          }
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "register" ? 8 : 6}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-[var(--cm-primary-container)] py-3.5 text-base font-bold text-white shadow-lg disabled:opacity-60"
        >
          {loading ? "请稍候…" : mode === "login" ? "登录" : "注册并登录"}
        </button>
      </form>

      {isDev ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleDevLogin()}
          className="mt-4 w-full rounded-2xl border border-[#c3c6d7] bg-white py-3 text-sm font-semibold text-[var(--cm-primary)] disabled:opacity-60"
        >
          开发登录（演示账号）
        </button>
      ) : null}

      {error ? (
        <p className="mt-4 text-center text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
