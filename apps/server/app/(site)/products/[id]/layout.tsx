import type { Metadata } from "next";

import { parseImages } from "@campus/db";
import { ProductStatus } from "@campus/shared";

import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await prisma.product.findFirst({
      where: { id, status: ProductStatus.ON_SALE },
      select: { title: true, description: true, images: true },
    });
    if (!product) {
      return { title: "商品详情" };
    }
    const images = parseImages(product.images);
    const description =
      product.description?.slice(0, 120) || "校园二手好物，来自校园集市";
    return {
      title: product.title,
      description,
      openGraph: {
        title: product.title,
        description,
        images: images[0] ? [{ url: images[0] }] : undefined,
      },
    };
  } catch {
    return { title: "商品详情" };
  }
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
