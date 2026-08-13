import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App 通过 WebView 加载 Next 网站（含 API）。
 * 开发：改成你电脑的局域网 IP（手机需同一 WiFi）。
 * 生产：改成部署后的 https 域名，并关闭 cleartext。
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL ?? "http://192.168.0.104:3000";
const isHttps = serverUrl.startsWith("https://");

const config: CapacitorConfig = {
  appId: "com.campus.market",
  appName: "校园集市",
  webDir: "www",
  server: {
    url: serverUrl,
    cleartext: !isHttps,
  },
  android: {
    allowMixedContent: !isHttps,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 800,
      backgroundColor: "#f8f9ff",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f8f9ff",
    },
  },
};

export default config;
