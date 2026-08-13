"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isNativePlatform } from "@/lib/native";

/**
 * Capacitor 原生壳初始化：状态栏、Splash、Android 返回键。
 */
export function NativeShell() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let removeBack: (() => void) | undefined;

    void (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#f8f9ff" });
      } catch {
        /* 插件未装好时忽略 */
      }

      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* ignore */
      }

      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          if (pathname.startsWith("/chat/") || pathname !== "/") {
            if (canGoBack) router.back();
            else router.push("/");
            return;
          }
          void App.minimizeApp();
        });
        removeBack = () => {
          void handle.remove();
        };
      } catch {
        /* ignore */
      }

      try {
        const { Keyboard } = await import("@capacitor/keyboard");
        await Keyboard.setScroll({ isDisabled: false });
      } catch {
        /* ignore */
      }
    })();

    return () => {
      removeBack?.();
    };
  }, [pathname, router]);

  return null;
}
