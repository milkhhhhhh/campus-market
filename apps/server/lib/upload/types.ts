export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];

export interface UploadFileInput {
  buffer: Buffer;
  mimeType: AllowedImageMime;
  originalName: string;
  size: number;
}

export interface StoredFile {
  url: string;
  key: string;
}

export interface StorageProvider {
  upload(
    userId: string,
    files: UploadFileInput[],
  ): Promise<StoredFile[]>;
}

export interface UploadConfig {
  provider: "local" | "oss";
  baseUrl: string;
  maxFileSizeBytes: number;
  maxFiles: number;
  allowedMimeTypes: readonly AllowedImageMime[];
  localRootDir: string;
}

export class UploadValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "UploadValidationError";
  }
}
