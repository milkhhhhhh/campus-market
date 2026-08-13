import {
  StickerFavoriteKind,
  stickerFavoriteKey,
  type StickerFavoriteDTO,
} from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError } from "@/lib/route-error";
import { addStickerFavoriteSchema } from "@/lib/schemas/chat";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

function toStickerFavoriteDTO(row: {
  id: string;
  kind: string;
  stickerId: string | null;
  imageUrl: string | null;
  createdAt: Date;
}): StickerFavoriteDTO {
  return {
    id: row.id,
    kind: row.kind as StickerFavoriteKind,
    stickerId: row.stickerId,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const rows = await prisma.stickerFavorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return ok(rows.map(toStickerFavoriteDTO));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const input = await validateJson(request, addStickerFavoriteSchema);

    const kind = input.kind;
    const stickerId =
      kind === StickerFavoriteKind.BUILTIN ? input.stickerId! : null;
    const imageUrl =
      kind === StickerFavoriteKind.IMAGE ? input.imageUrl! : null;
    const key = stickerFavoriteKey(kind, stickerId, imageUrl);

    const row = await prisma.stickerFavorite.upsert({
      where: {
        userId_key: { userId: user.id, key },
      },
      create: {
        userId: user.id,
        key,
        kind,
        stickerId,
        imageUrl,
      },
      update: {},
    });

    return ok(toStickerFavoriteDTO(row), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
