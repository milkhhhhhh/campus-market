import { z } from "zod";

/** Absolute http(s) URL or same-origin `/uploads/...` path (no `..`). */
export function isImageRef(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith("/uploads/")) {
    const rest = trimmed.slice("/uploads/".length);
    return (
      rest.length > 0 &&
      !rest.includes("..") &&
      !rest.includes("//") &&
      !rest.startsWith("/")
    );
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const imageRefSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(isImageRef, { message: "图片地址无效" });
