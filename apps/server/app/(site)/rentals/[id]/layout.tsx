import type { Metadata } from "next";

import { parseImages } from "@campus/db";
import { RentalStatus } from "@campus/shared";

import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const item = await prisma.rentalItem.findFirst({
      where: { id, rentalStatus: RentalStatus.AVAILABLE },
      select: { title: true, description: true, images: true },
    });
    if (!item) {
      return { title: "租借详情" };
    }
    const images = parseImages(item.images);
    const description =
      item.description?.slice(0, 120) || "校园闲置租借，来自校园集市";
    return {
      title: item.title,
      description,
      openGraph: {
        title: item.title,
        description,
        images: images[0] ? [{ url: images[0] }] : undefined,
      },
    };
  } catch {
    return { title: "租借详情" };
  }
}

export default function RentalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
