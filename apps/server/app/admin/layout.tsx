import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理后台",
  description: "校园集市管理后台",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
