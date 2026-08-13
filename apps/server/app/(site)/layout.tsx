import type { Metadata } from "next";

import { DevicePushRegistrar } from "@/components/site/DevicePushRegistrar";
import { NativeShell } from "@/components/site/NativeShell";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteTabBar } from "@/components/site/SiteTabBar";
import { SiteAuthProvider } from "@/lib/site-auth";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "校园集市",
    template: "%s · 校园集市",
  },
  description: "校园二手交易与闲置租借平台",
  openGraph: {
    title: "校园集市",
    description: "校园二手交易与闲置租借平台",
    siteName: "校园集市",
    type: "website",
  },
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteAuthProvider>
      <div className="site-shell">
        <NativeShell />
        <DevicePushRegistrar />
        <SiteHeader />
        <main className="site-main mx-auto max-w-5xl px-4 py-6">
          {children}
        </main>
        <SiteTabBar />
      </div>
    </SiteAuthProvider>
  );
}
