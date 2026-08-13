import { getUploadConfig } from "@/lib/upload/config";
import { LocalStorageProvider } from "@/lib/upload/local-provider";
import type { StorageProvider, UploadConfig } from "@/lib/upload/types";
import { RouteError } from "@/lib/route-error";

let cachedProvider: StorageProvider | null = null;
let cachedProviderKind: string | null = null;

export function createStorageProvider(config: UploadConfig): StorageProvider {
  if (config.provider === "local") {
    return new LocalStorageProvider(config);
  }

  throw new RouteError(
    "UPLOAD_STORAGE_NOT_IMPLEMENTED",
    "OSS 存储尚未实现，请使用 UPLOAD_STORAGE=local",
    501,
  );
}

/** 无 Request 时的默认 provider（测试/脚本）；线上上传请用 createStorageProvider(getUploadConfig(request)) */
export function getStorageProvider(): StorageProvider {
  const config = getUploadConfig();
  const cacheKey = `${config.provider}:${config.localRootDir}:${config.baseUrl}`;

  if (cachedProvider && cachedProviderKind === cacheKey) {
    return cachedProvider;
  }

  cachedProvider = createStorageProvider(config);
  cachedProviderKind = cacheKey;
  return cachedProvider;
}

export { getUploadConfig, resolveUploadBaseUrl } from "@/lib/upload/config";
