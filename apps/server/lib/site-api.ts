"use client";

import type { ApiResult } from "@campus/shared";

export class SiteApiError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "SiteApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const TOKEN_KEY = "cm_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

type QueryValue = string | number | boolean | null | undefined;

function buildUrl(path: string, query?: object): string {
  const url = path.startsWith("/") ? path : `/${path}`;
  if (!query) return url;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query as Record<string, QueryValue>)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  }
  if (parts.length === 0) return url;
  return `${url}?${parts.join("&")}`;
}

export interface SiteRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: unknown;
  query?: object;
  auth?: boolean;
  formData?: FormData;
}

export async function siteRequest<T>(
  path: string,
  options: SiteRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    data,
    query,
    auth = true,
    formData,
  } = options;

  const headers: Record<string, string> = {};
  if (auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (!formData && data !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: formData
      ? formData
      : data !== undefined
        ? JSON.stringify(data)
        : undefined,
  });

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new SiteApiError("响应解析失败", "PARSE_ERROR", res.status);
  }

  const result = payload as ApiResult<T>;
  if (!res.ok || !result || result.success === false) {
    const err = result && "error" in result ? result.error : undefined;
    if (auth && res.status === 401 && typeof window !== "undefined") {
      setStoredToken(null);
      const path = window.location.pathname + window.location.search;
      if (!path.startsWith("/login")) {
        const next = encodeURIComponent(path || "/");
        window.location.assign(`/login?next=${next}`);
      }
    }
    const issues = err?.details?.issues;
    const firstIssue =
      Array.isArray(issues) &&
      issues[0] &&
      typeof issues[0] === "object" &&
      issues[0] !== null &&
      "message" in issues[0] &&
      typeof (issues[0] as { message: unknown }).message === "string"
        ? (issues[0] as { message: string }).message
        : null;
    const baseMessage = err?.message ?? `请求失败 (${res.status})`;
    throw new SiteApiError(
      firstIssue && firstIssue !== baseMessage
        ? `${baseMessage}（${firstIssue}）`
        : baseMessage,
      err?.code ?? "REQUEST_FAILED",
      res.status,
    );
  }
  return result.data;
}
