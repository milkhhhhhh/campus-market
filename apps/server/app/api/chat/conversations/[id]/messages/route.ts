import type { Prisma } from "@campus/db";

import { getUserFromRequest } from "@/lib/auth";
import {
  previewMessageContent,
  serverTime,
  toMessageDTO,
} from "@/lib/chat-dto";
import {
  assertConversationParticipant,
  markConversationMessagesRead,
} from "@/lib/chat-helpers";
import { paginated, paginationArgs } from "@/lib/listing-query";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";
import {
  messageListQuerySchema,
  sendMessageSchema,
} from "@/lib/schemas/chat";
import { validateJson, validateQuery } from "@/lib/validate";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await getUserFromRequest(request);
    const { id: conversationId } = await context.params;
    const query = validateQuery(request, messageListQuerySchema);

    const result = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw new RouteError("NOT_FOUND", "会话不存在", 404);
      }
      assertConversationParticipant(conversation, user.id);

      const markedReadCount = await markConversationMessagesRead(
        tx,
        conversationId,
        user.id,
      );

      let where: Prisma.MessageWhereInput = { conversationId };
      let orderBy: Prisma.MessageOrderByWithRelationInput[] = [
        { createdAt: "asc" },
        { id: "asc" },
      ];
      let reverseItems = false;

      if (query.after) {
        const cursor = await tx.message.findFirst({
          where: { id: query.after, conversationId },
        });
        if (!cursor) {
          throw new RouteError("NOT_FOUND", "游标消息不存在", 404);
        }
        where = {
          conversationId,
          OR: [
            { createdAt: { gt: cursor.createdAt } },
            {
              createdAt: cursor.createdAt,
              id: { gt: cursor.id },
            },
          ],
        };
        orderBy = [{ createdAt: "asc" }, { id: "asc" }];
      } else if (query.before) {
        const cursor = await tx.message.findFirst({
          where: { id: query.before, conversationId },
        });
        if (!cursor) {
          throw new RouteError("NOT_FOUND", "游标消息不存在", 404);
        }
        where = {
          conversationId,
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            {
              createdAt: cursor.createdAt,
              id: { lt: cursor.id },
            },
          ],
        };
        orderBy = [{ createdAt: "desc" }, { id: "desc" }];
        reverseItems = true;
      }

      const take = query.after || query.before
        ? query.pageSize
        : paginationArgs(query.page, query.pageSize).take;
      const skip =
        query.after || query.before
          ? undefined
          : paginationArgs(query.page, query.pageSize).skip;

      const [total, rows] = await Promise.all([
        tx.message.count({ where: { conversationId } }),
        tx.message.findMany({
          where,
          orderBy,
          ...(skip !== undefined ? { skip } : {}),
          take,
        }),
      ]);

      const items = reverseItems
        ? rows.reverse().map(toMessageDTO)
        : rows.map(toMessageDTO);

      return {
        ...paginated(
          items,
          total,
          query.after || query.before ? 1 : query.page,
          query.pageSize,
        ),
        serverTime: serverTime(),
        markedReadCount,
      };
    });

    return ok(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await getUserFromRequest(request);
    const { id: conversationId } = await context.params;
    const input = await validateJson(request, sendMessageSchema);

    const message = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw new RouteError("NOT_FOUND", "会话不存在", 404);
      }
      assertConversationParticipant(conversation, user.id);

      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: user.id,
          type: input.type,
          content: input.content,
          read: false,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: previewMessageContent(input.content, input.type),
          lastMessageAt: created.createdAt,
        },
      });

      return created;
    });

    return ok(toMessageDTO(message), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
