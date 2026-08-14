import {
  isBuiltinStickerId,
  ListingType,
  StickerFavoriteKind,
} from "@campus/shared";
import { z } from "zod";

import { isImageRef } from "@/lib/schemas/image-ref";

const page = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(20);
const id = z.string().trim().min(1).max(100);
const isoDateTime = z
  .string()
  .trim()
  .datetime({ offset: true })
  .optional();

export const createConversationSchema = z
  .strictObject({
    peerId: id,
    listingType: z.nativeEnum(ListingType).optional(),
    listingId: id.optional(),
  })
  .refine(
    (value) =>
      (value.listingType === undefined) ===
      (value.listingId === undefined),
    {
      message: "listingType 与 listingId 需同时提供或同时省略",
      path: ["listingType"],
    },
  );

export const conversationListQuerySchema = z.strictObject({
  page,
  pageSize,
  updatedSince: isoDateTime,
});

export const messageListQuerySchema = z.strictObject({
  page,
  pageSize,
  after: id.optional(),
  before: id.optional(),
});

export const sendMessageSchema = z
  .strictObject({
    type: z.enum(["TEXT", "IMAGE", "STICKER", "SYSTEM", "LISTING_CARD"]),
    content: z.string().trim().min(1).max(5_000),
  })
  .superRefine((value, ctx) => {
    if (value.type === "IMAGE" && !isImageRef(value.content)) {
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: "图片地址无效",
      });
      return;
    }
    if (value.type !== "STICKER") return;
    if (!isBuiltinStickerId(value.content)) {
      ctx.addIssue({
        code: "custom",
        path: ["content"],
        message: "未知的内置表情",
      });
    }
  });

export const addStickerFavoriteSchema = z
  .strictObject({
    kind: z.nativeEnum(StickerFavoriteKind),
    stickerId: z.string().trim().min(1).max(100).optional(),
    imageUrl: z
      .string()
      .trim()
      .max(2_000)
      .refine(isImageRef, { message: "图片地址无效" })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === StickerFavoriteKind.BUILTIN) {
      if (!value.stickerId || !isBuiltinStickerId(value.stickerId)) {
        ctx.addIssue({
          code: "custom",
          path: ["stickerId"],
          message: "请提供有效的内置表情 id",
        });
      }
      return;
    }
    if (!value.imageUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["imageUrl"],
        message: "请提供图片表情 URL",
      });
    }
  });
