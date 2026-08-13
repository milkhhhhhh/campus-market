import { toCategoryTree } from "@/lib/listing-dto";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError } from "@/lib/route-error";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await prisma.category.findMany();
    return ok(toCategoryTree(categories));
  } catch (error) {
    return handleRouteError(error);
  }
}
