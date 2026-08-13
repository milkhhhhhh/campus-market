import type { MetadataRoute } from "next";

import { ProductStatus, RentalStatus } from "@campus/shared";

import { prisma } from "@/lib/prisma";

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: origin, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/search`, changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const [products, rentals] = await Promise.all([
      prisma.product.findMany({
        where: { status: ProductStatus.ON_SALE },
        select: { id: true, updatedAt: true },
        take: 5000,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.rentalItem.findMany({
        where: { rentalStatus: RentalStatus.AVAILABLE },
        select: { id: true, updatedAt: true },
        take: 5000,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return [
      ...staticRoutes,
      ...products.map((p) => ({
        url: `${origin}/products/${p.id}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...rentals.map((r) => ({
        url: `${origin}/rentals/${r.id}`,
        lastModified: r.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
