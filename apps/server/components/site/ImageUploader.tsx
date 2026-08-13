"use client";

import { useState } from "react";

import { UPLOAD } from "@campus/shared";

import { pickImages, useIsNativePlatform } from "@/lib/native";
import { siteRequest, SiteApiError } from "@/lib/site-api";

export function ImageUploader({
  value,
  onChange,
  max = 9,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    const remain = max - value.length;
    if (remain <= 0) return;
    setUploading(true);
    setError(null);
    try {
      const next = [...value];
      for (const file of files.slice(0, remain)) {
        const fd = new FormData();
        fd.append("file", file);
        const result = await siteRequest<{ urls: string[] }>(UPLOAD.file, {
          method: "POST",
          formData: fd,
        });
        if (result.urls[0]) next.push(result.urls[0]);
      }
      onChange(next);
    } catch (e) {
      setError(e instanceof SiteApiError ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handleAdd() {
    const remain = max - value.length;
    if (remain <= 0 || uploading) return;
    const files = await pickImages(remain);
    await uploadFiles(files);
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    await uploadFiles(Array.from(files));
  }

  const native = useIsNativePlatform();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {value.map((url) => (
          <div
            key={url}
            className="relative h-24 w-24 overflow-hidden rounded-xl bg-[var(--cm-surface-low)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              className="absolute right-0 top-0 min-h-8 min-w-8 bg-black/60 px-1.5 text-xs text-white"
              onClick={() => onChange(value.filter((u) => u !== url))}
            >
              ×
            </button>
          </div>
        ))}
        {value.length < max ? (
          native ? (
            <button
              type="button"
              disabled={uploading}
              onClick={() => void handleAdd()}
              className="flex h-24 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c3c6d7] bg-[var(--cm-surface-low)] text-[var(--cm-primary)]"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="mt-1 text-xs text-[var(--cm-on-surface-variant)]">
                {uploading ? "上传中" : "拍照/相册"}
              </span>
            </button>
          ) : (
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c3c6d7] bg-[var(--cm-surface-low)] text-[var(--cm-primary)]">
              <span className="text-2xl leading-none">+</span>
              <span className="mt-1 text-xs text-[var(--cm-on-surface-variant)]">
                {uploading ? "上传中" : "添加"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={(e) => void handleFiles(e.target.files)}
              />
            </label>
          )
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
