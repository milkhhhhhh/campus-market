"use client";

import { useEffect, useState } from "react";

export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** 避免 SSR/水合不一致：首屏为 false，挂载后再检测 */
export function useIsNativePlatform(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(isNativePlatform());
  }, []);
  return native;
}

export async function pickImages(max: number): Promise<File[]> {
  if (max <= 0) return [];

  if (!isNativePlatform()) {
    return pickImagesViaInput(max);
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import(
      "@capacitor/camera"
    );
    const files: File[] = [];
    const count = Math.min(max, 9);
    for (let i = 0; i < count; i += 1) {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
      });
      if (!photo.webPath) break;
      const res = await fetch(photo.webPath);
      const blob = await res.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      files.push(
        new File([blob], `photo-${Date.now()}-${i}.${ext}`, {
          type: blob.type || "image/jpeg",
        }),
      );
    }
    return files;
  } catch {
    return [];
  }
}

function pickImagesViaInput(max: number): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = max > 1;
    input.onchange = () => {
      const list = input.files ? Array.from(input.files).slice(0, max) : [];
      resolve(list);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}
