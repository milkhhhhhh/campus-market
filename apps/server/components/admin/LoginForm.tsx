"use client";

import { useState, type FormEvent } from "react";

const ADMIN_LOGIN_API = "/api/admin/auth/login";

export function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch(ADMIN_LOGIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          username,
          password,
          ...(next ? { next } : {}),
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        data?: { redirectTo?: string };
        error?: { message?: string };
      };

      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? "账号或密码错误");
        return;
      }

      const redirectTo =
        payload.data?.redirectTo &&
        payload.data.redirectTo.startsWith("/admin")
          ? payload.data.redirectTo
          : "/admin";
      window.location.assign(redirectTo);
    } catch {
      // If fetch/hydration is broken, fall back to native form POST.
      form.submit();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      method="post"
      action={ADMIN_LOGIN_API}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div>
        <label
          htmlFor="username"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          账号
        </label>
        <input
          id="username"
          name="username"
          required
          autoComplete="username"
          defaultValue="admin"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "登录中..." : "登录"}
      </button>
    </form>
  );
}
