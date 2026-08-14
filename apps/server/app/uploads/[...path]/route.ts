import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { getUploadConfig } from "@/lib/upload";
import { fail } from "@/lib/response";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

type RouteContext = { params: Promise<{ path: string[] }> };

function resolveSafePath(rootDir: string, parts: string[]): string | null {
  if (!parts.length) return null;
  if (
    parts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        part.includes("\0") ||
        part.includes("/") ||
        part.includes("\\"),
    )
  ) {
    return null;
  }

  const root = path.resolve(rootDir);
  const absolute = path.resolve(root, ...parts);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (absolute !== root && !absolute.startsWith(prefix)) {
    return null;
  }
  return absolute;
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { path: parts } = await context.params;
    const { localRootDir } = getUploadConfig();
    const absolutePath = resolveSafePath(localRootDir, parts);
    if (!absolutePath) {
      return fail("NOT_FOUND", "文件不存在", 404);
    }

    if (!existsSync(absolutePath)) {
      return fail("NOT_FOUND", "文件不存在", 404);
    }

    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      return fail("NOT_FOUND", "文件不存在", 404);
    }

    const ext = path.extname(absolutePath).toLowerCase();
    const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
    const nodeStream = createReadStream(absolutePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileStat.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return fail("NOT_FOUND", "文件不存在", 404);
  }
}
