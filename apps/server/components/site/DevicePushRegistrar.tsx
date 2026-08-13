"use client";

import { useEffect } from "react";

import { DEVICES } from "@campus/shared";

import { isNativePlatform } from "@/lib/native";
import { siteRequest } from "@/lib/site-api";
import { useSiteAuth } from "@/lib/site-auth";

/**
 * 登录后若 Preferences 中已有 FCM/APNs token（键 cm_push_token），则上报后端。
 * 接入原生推送插件后写入该键即可。
 */
export function DevicePushRegistrar() {
  const { ready, user } = useSiteAuth();

  useEffect(() => {
    if (!ready || !user || !isNativePlatform()) return;

    void (async () => {
      try {
        const { Preferences } = await import("@capacitor/preferences");
        const { Capacitor } = await import("@capacitor/core");
        const { value } = await Preferences.get({ key: "cm_push_token" });
        if (!value) return;
        const platform = Capacitor.getPlatform();
        const normalized =
          platform === "ios" || platform === "android" ? platform : "web";
        await siteRequest(DEVICES.register, {
          method: "POST",
          data: { token: value, platform: normalized },
        });
      } catch {
        /* 未配置推送时忽略 */
      }
    })();
  }, [ready, user]);

  return null;
}
