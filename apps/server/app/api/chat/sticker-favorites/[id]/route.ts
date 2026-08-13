import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await getUserFromRequest(request);
    const { id } = await context.params;

    const existing = await prisma.stickerFavorite.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      throw new RouteError("NOT_FOUND", "收藏不存在", 404);
    }

    await prisma.stickerFavorite.delete({ where: { id } });
    return ok({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
