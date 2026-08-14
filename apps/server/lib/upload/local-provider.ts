import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { extensionForMime } from "@/lib/upload/validate";
import type {
  StorageProvider,
  StoredFile,
  UploadConfig,
  UploadFileInput,
} from "@/lib/upload/types";

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly config: UploadConfig) {}

  async upload(
    userId: string,
    files: UploadFileInput[],
  ): Promise<StoredFile[]> {
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const relativeDir = path.join(userId, year, month);
    const absoluteDir = path.join(
      this.config.localRootDir,
      relativeDir,
    );
    await mkdir(absoluteDir, { recursive: true });

    const stored: StoredFile[] = [];

    for (const file of files) {
      const ext = extensionForMime(file.mimeType);
      const filename = `${randomUUID()}.${ext}`;
      const relativeKey = path.posix.join(
        relativeDir.replace(/\\/g, "/"),
        filename,
      );
      const absolutePath = path.join(absoluteDir, filename);
      await writeFile(absolutePath, file.buffer);

      stored.push({
        key: relativeKey,
        // Same-origin relative URL so previews work behind any public host.
        url: `/uploads/${relativeKey}`,
      });
    }

    return stored;
  }
}
