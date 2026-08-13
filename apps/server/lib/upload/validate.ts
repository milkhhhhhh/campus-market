import {
  ALLOWED_IMAGE_MIMES,
  UploadValidationError,
  type AllowedImageMime,
  type UploadConfig,
  type UploadFileInput,
} from "@/lib/upload/types";

function isAllowedMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime);
}

function extensionForMime(mime: AllowedImageMime): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export { extensionForMime };

function matchesMagicBytes(
  buffer: Buffer,
  mime: AllowedImageMime,
): boolean {
  if (buffer.length < 12) return false;

  switch (mime) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "image/gif":
      return (
        buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
        buffer.subarray(0, 6).toString("ascii") === "GIF89a"
      );
    case "image/webp":
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}

export async function parseUploadFormFiles(
  formData: FormData,
): Promise<File[]> {
  // Accept both "files" (preferred) and legacy "file" field names.
  const files = [...formData.getAll("files"), ...formData.getAll("file")].filter(
    (entry): entry is File => entry instanceof File,
  );

  if (files.length === 0) {
    throw new UploadValidationError(
      "UPLOAD_FILES_REQUIRED",
      "请至少上传一个文件",
    );
  }

  return files;
}

export async function validateUploadFiles(
  files: File[],
  config: UploadConfig,
): Promise<UploadFileInput[]> {
  if (files.length > config.maxFiles) {
    throw new UploadValidationError(
      "UPLOAD_TOO_MANY_FILES",
      `单次最多上传 ${config.maxFiles} 个文件`,
    );
  }

  const validated: UploadFileInput[] = [];

  for (const file of files) {
    if (file.size <= 0) {
      throw new UploadValidationError(
        "UPLOAD_EMPTY_FILE",
        "文件不能为空",
      );
    }
    if (file.size > config.maxFileSizeBytes) {
      throw new UploadValidationError(
        "UPLOAD_FILE_TOO_LARGE",
        `单个文件不能超过 ${config.maxFileSizeBytes} 字节`,
      );
    }
    if (!isAllowedMime(file.type)) {
      throw new UploadValidationError(
        "UPLOAD_INVALID_FILE_TYPE",
        "仅支持 JPEG、PNG、WebP、GIF 图片",
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesMagicBytes(buffer, file.type)) {
      throw new UploadValidationError(
        "UPLOAD_INVALID_FILE_CONTENT",
        "文件内容与声明类型不匹配",
      );
    }

    validated.push({
      buffer,
      mimeType: file.type,
      originalName: file.name,
      size: file.size,
    });
  }

  return validated;
}
