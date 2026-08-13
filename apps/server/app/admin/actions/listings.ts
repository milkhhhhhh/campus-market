"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin-auth-server";
import { prisma } from "@/lib/prisma";
import { ProductStatus, RentalStatus, VerifyStatus } from "@campus/shared";

export async function offShelfProduct(productId: string) {
  await requireAdminSession();
  await prisma.product.updateMany({
    where: { id: productId },
    data: { status: ProductStatus.OFF_SHELF },
  });
  revalidatePath("/admin/products");
}

export async function offShelfRental(rentalId: string) {
  await requireAdminSession();
  await prisma.rentalItem.updateMany({
    where: { id: rentalId },
    data: { rentalStatus: RentalStatus.OFF_SHELF },
  });
  revalidatePath("/admin/rentals");
}
