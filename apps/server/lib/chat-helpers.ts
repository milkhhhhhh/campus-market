import type { PrismaClient } from "@campus/db";
import { ListingType } from "@campus/shared";

import { RouteError } from "@/lib/route-error";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

export function normalizeUserPair(
  currentUserId: string,
  peerId: string,
): [string, string] {
  return [currentUserId, peerId].sort() as [string, string];
}

export function buildContextKey(
  listingType?: ListingType,
  listingId?: string,
): string {
  if (listingType && listingId) {
    return `${listingType}:${listingId}`;
  }
  if (listingType || listingId) {
    throw new RouteError(
      "INVALID_CONVERSATION_CONTEXT",
      "挂牌会话需同时提供 listingType 与 listingId",
      422,
    );
  }
  return "DIRECT";
}

export function assertConversationParticipant(
  conversation: { userAId: string; userBId: string },
  userId: string,
): void {
  if (
    conversation.userAId !== userId &&
    conversation.userBId !== userId
  ) {
    throw new RouteError("FORBIDDEN", "无权访问该会话", 403);
  }
}

export async function countUnreadByConversation(
  tx: TransactionClient,
  conversationIds: string[],
  currentUserId: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>(
    conversationIds.map((id) => [id, 0]),
  );
  if (conversationIds.length === 0) return counts;

  const grouped = await tx.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversationIds },
      senderId: { not: currentUserId },
      read: false,
    },
    _count: { _all: true },
  });

  for (const row of grouped) {
    counts.set(row.conversationId, row._count._all);
  }
  return counts;
}

export async function markConversationMessagesRead(
  tx: TransactionClient,
  conversationId: string,
  currentUserId: string,
): Promise<number> {
  const updated = await tx.message.updateMany({
    where: {
      conversationId,
      senderId: { not: currentUserId },
      read: false,
    },
    data: { read: true },
  });
  return updated.count;
}

export function getPeerId(
  conversation: { userAId: string; userBId: string },
  currentUserId: string,
): string {
  return conversation.userAId === currentUserId
    ? conversation.userBId
    : conversation.userAId;
}
