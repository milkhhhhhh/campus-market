/**
 * 全平台共享枚举。取值使用字符串字面量，需与 packages/db 的 Prisma schema 保持一致。
 */

/** 用户角色 */
export enum UserRole {
  STUDENT = "STUDENT",
  ADMIN = "ADMIN",
}

/** 校园认证状态 */
export enum VerifyStatus {
  UNVERIFIED = "UNVERIFIED",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

/** 挂牌类型：出售(二手) / 出租(闲置租借) */
export enum ListingType {
  SALE = "SALE",
  RENT = "RENT",
}

/** 商品成色 */
export enum ProductCondition {
  NEW = "NEW",
  LIKE_NEW = "LIKE_NEW",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
}

/** 二手商品挂牌状态 */
export enum ProductStatus {
  DRAFT = "DRAFT",
  ON_SALE = "ON_SALE",
  LOCKED = "LOCKED",
  SOLD = "SOLD",
  OFF_SHELF = "OFF_SHELF",
}

/** 闲置租借物品的可租状态 */
export enum RentalStatus {
  AVAILABLE = "AVAILABLE",
  RENTED = "RENTED",
  OFF_SHELF = "OFF_SHELF",
}

/** 交易订单状态 */
export enum OrderStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  SHIPPED = "SHIPPED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REFUNDING = "REFUNDING",
  REFUNDED = "REFUNDED",
}

/** 租借订单状态 */
export enum RentalOrderStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  IN_USE = "IN_USE",
  RETURNED = "RETURNED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  OVERDUE = "OVERDUE",
}

/** 举报处理状态 */
export enum ReportStatus {
  PENDING = "PENDING",
  REVIEWING = "REVIEWING",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

/** 站内消息类型 */
export enum MessageType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  STICKER = "STICKER",
  SYSTEM = "SYSTEM",
  LISTING_CARD = "LISTING_CARD",
}

/** 聊天表情收藏类型 */
export enum StickerFavoriteKind {
  BUILTIN = "BUILTIN",
  IMAGE = "IMAGE",
}
