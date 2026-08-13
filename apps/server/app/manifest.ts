import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "校园集市",
    short_name: "校园集市",
    description: "校园二手交易与闲置租借平台",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9ff",
    theme_color: "#004ac6",
    lang: "zh-CN",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
