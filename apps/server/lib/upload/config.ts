import path from "node:path";

import {
  ALLOWED_IMAGE_MIMES,
  type UploadConfig,
} from "@/lib/upload/types";
import { RouteError } from "@/lib/route-error";

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_MAX_FILES = 9;
const DEFAULT_BASE_URL = "http://localhost:3000/uploads";

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getDefaultLocalRootDir(): string {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "public",
    "uploads",
  );
}

function isLoopbackBaseUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

/**
 * 解析对外可访问的上传基址。
 * - 显式非 localhost 的 UPLOAD_BASE_URL 优先（生产 CDN/域名）
 * - 开发时若配置了 localhost，则按请求 Host 生成（真机/App 可访问）
 * - UPLOAD_RESOLVE_FROM_REQUEST=true 时始终按请求 Host
 */
export function resolveUploadBaseUrl(request?: Request): string {
  const configured = (process.env.UPLOAD_BASE_URL ?? "").replace(/\/+$/, "");
  const forceFromRequest = process.env.UPLOAD_RESOLVE_FROM_REQUEST === "true";

  if (
    request &&
    (forceFromRequest || !configured || isLoopbackBaseUrl(configured))
  ) {
    const url = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const host =
      forwardedHost?.split(",")[0]?.trim() ||
      request.headers.get("host") ||
      url.host;
    const proto =
      forwardedProto?.split(",")[0]?.trim() ||
      url.protocol.replace(":", "") ||
      "http";
    return `${proto}://${host}/uploads`;
  }

  if (configured) return configured;
  return DEFAULT_BASE_URL;
}

export function getUploadConfig(request?: Request): UploadConfig {
  const provider = process.env.UPLOAD_STORAGE ?? "local";
  if (provider !== "local" && provider !== "oss") {
    throw new RouteError(
      "UPLOAD_CONFIG_ERROR",
      "UPLOAD_STORAGE 仅支持 local 或 oss",
      500,
    );
  }

  return {
    provider,
    baseUrl: resolveUploadBaseUrl(request),
    maxFileSizeBytes: parsePositiveInt(
      process.env.UPLOAD_MAX_FILE_SIZE,
      DEFAULT_MAX_FILE_SIZE,
    ),
    maxFiles: parsePositiveInt(
      process.env.UPLOAD_MAX_FILES,
      DEFAULT_MAX_FILES,
    ),
    allowedMimeTypes: ALLOWED_IMAGE_MIMES,
    localRootDir: process.env.UPLOAD_LOCAL_ROOT_DIR ?? getDefaultLocalRootDir(),
  };
}
