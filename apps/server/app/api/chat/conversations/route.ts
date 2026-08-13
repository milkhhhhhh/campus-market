import type { Prisma } from "@campus/db";
import { ListingType } from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import {
  serverTime,
  toConversationListItemDTO,
} from "@/lib/chat-dto";
import {
  buildContextKey,
  countUnreadByConversation,
  normalizeUserPair,
} from "@/lib/chat-helpers";
import { paginated, paginationArgs } from "@/lib/listing-query";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";
import {
  conversationListQuerySchema,
  createConversationSchema,
} from "@/lib/schemas/chat";
import { validateJson, validateQuery } from "@/lib/validate";

export const runtime = "nodejs";

const include = { userA: true, userB: true } as const;

function participantWhere(userId: string): Prisma.ConversationWhereInput {
  return {
    OR: [{ userAId: userId }, { userBId: userId }],
  };
}

async function buildListWhere(
  userId: string,
  updatedSince?: string,
): Promise<Prisma.ConversationWhereInput> {
  const base = participantWhere(userId);
  if (!updatedSince) return base;

  const since = new Date(updatedSince);
  if (Number.isNaN(since.getTime())) {
    throw new RouteError(
      "INVALID_UPDATED_SINCE",
      "updatedSince 不是合法 ISO8601 时间",
      422,
    );
  }

  const unreadRows = await prisma.message.findMany({
    where: {
      read: false,
      senderId: { not: userId },
      conversation: base,
    },
    select: { conversationId: true },
    distinct: ["conversationId"],
  });
  const unreadIds = unreadRows.map((row) => row.conversationId);

  return {
    AND: [
      base,
      {
        OR: [
          { lastMessageAt: { gt: since } },
          ...(unreadIds.length
            ? [{ id: { in: unreadIds } }]
            : []),
        ],
      },
    ],
  };
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const query = validateQuery(request, conversationListQuerySchema);
    const where = await buildListWhere(user.id, query.updatedSince);

    const [total, conversations] = await prisma.$transaction([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        include,
        orderBy: [
          { lastMessageAt: "desc" },
          { createdAt: "desc" },
        ],
        ...paginationArgs(query.page, query.pageSize),
      }),
    ]);

    const unreadMap = await countUnreadByConversation(
      prisma,
      conversations.map((item) => item.id),
      user.id,
    );

    const items = conversations.map((conversation) =>
      toConversationListItemDTO(
        conversation,
        user.id,
        unreadMap.get(conversation.id) ?? 0,
      ),
    );

    return ok({
      ...paginated(items, total, query.page, query.pageSize),
      serverTime: serverTime(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const input = await validateJson(request, createConversationSchema);

    if (input.peerId === user.id) {
      throw new RouteError(
        "CANNOT_CHAT_WITH_SELF",
        "不能与自己创建会话",
        422,
      );
    }

    const [userAId, userBId] = normalizeUserPair(
      user.id,
      input.peerId,
    );
    const contextKey = buildContextKey(
      input.listingType,
      input.listingId,
    );

    const existing = await prisma.conversation.findUnique({
      where: {
        userAId_userBId_contextKey: {
          userAId,
          userBId,
          contextKey,
        },
      },
      include,
    });
    if (existing) {
      return ok(
        toConversationListItemDTO(existing, user.id, 0),
        200,
      );
    }

    const peer = await prisma.user.findUnique({
      where: { id: input.peerId },
      select: { id: true },
    });
    if (!peer) {
      throw new RouteError("NOT_FOUND", "对方用户不存在", 404);
    }

    if (input.listingType && input.listingId) {
      if (input.listingType === ListingType.SALE) {
        const product = await prisma.product.findUnique({
          where: { id: input.listingId },
          select: { id: true },
        });
        if (!product) {
          throw new RouteError("NOT_FOUND", "关联商品不存在", 404);
        }
      } else {
        const rental = await prisma.rentalItem.findUnique({
          where: { id: input.listingId },
          select: { id: true },
        });
        if (!rental) {
          throw new RouteError("NOT_FOUND", "关联租借物品不存在", 404);
        }
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        userAId,
        userBId,
        listingType: input.listingType ?? null,
        listingId: input.listingId ?? null,
        contextKey,
      },
      include,
    });

    return ok(
      toConversationListItemDTO(conversation, user.id, 0),
      201,
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
