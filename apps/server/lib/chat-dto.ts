import type { Conversation, Message, User } from "@campus/db";
import {
  ListingType,
  MessageType,
  VerifyStatus,
  type ConversationDTO,
  type ConversationListItemDTO,
  type MessageDTO,
  type UserSummaryDTO,
} from "@campus/shared";

type ConversationWithUsers = Conversation & {
  userA?: User;
  userB?: User;
};

export function toUserSummaryDTO(user: User): UserSummaryDTO {
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    verifyStatus: user.verifyStatus as VerifyStatus,
  };
}

export function toConversationDTO(
  conversation: Conversation,
): ConversationDTO {
  return {
    id: conversation.id,
    userAId: conversation.userAId,
    userBId: conversation.userBId,
    listingType: conversation.listingType as ListingType | null,
    listingId: conversation.listingId,
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    createdAt: conversation.createdAt.toISOString(),
  };
}

export function toConversationListItemDTO(
  conversation: ConversationWithUsers,
  currentUserId: string,
  unreadCount: number,
): ConversationListItemDTO {
  const peerUser =
    conversation.userAId === currentUserId
      ? conversation.userB
      : conversation.userA;
  if (!peerUser) {
    throw new Error("Conversation peer user is missing");
  }
  return {
    ...toConversationDTO(conversation),
    peer: toUserSummaryDTO(peerUser),
    unreadCount,
  };
}

export function toMessageDTO(message: Message): MessageDTO {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    type: message.type as MessageType,
    content: message.content,
    read: message.read,
    createdAt: message.createdAt.toISOString(),
  };
}

export function previewMessageContent(
  content: string,
  type?: string,
): string {
  if (type === MessageType.STICKER) return "[表情]";
  if (type === MessageType.IMAGE) return "[图片]";
  if (content.length <= 500) return content;
  return `${content.slice(0, 500)}…`;
}

export function serverTime(): string {
  return new Date().toISOString();
}
