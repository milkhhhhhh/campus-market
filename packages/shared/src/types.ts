/**
 * 共享 DTO 与统一响应体。
 * 约定：id 为 string；时间字段为 ISO8601 字符串；金额单位为「分」(整数)，避免浮点误差。
 */
import type {
  UserRole,
  VerifyStatus,
  ListingType,
  ProductCondition,
  ProductStatus,
  RentalStatus,
  OrderStatus,
  RentalOrderStatus,
  ReportStatus,
  MessageType,
  StickerFavoriteKind,
} from "./enums";

/* ------------------------------------------------------------------ */
/* 通用响应体                                                          */
/* ------------------------------------------------------------------ */

/** 统一 API 错误体 */
export interface ApiError {
  code: string;
  message: string;
  /** 可选：字段级校验错误等附加信息 */
  details?: Record<string, unknown>;
}

/** 统一 API 响应：判别式联合，success 作为判别符 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

/** 分页查询入参 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
}

/** 分页响应体 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type ListingSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "popular";

export interface ProductListQuery extends PageQuery {
  keyword?: string;
  categoryId?: string;
  condition?: ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  sort?: ListingSort;
}

export interface ProductMineQuery extends PageQuery {
  status?: ProductStatus;
}

export interface RentalListQuery extends PageQuery {
  keyword?: string;
  categoryId?: string;
  minDailyPrice?: number;
  maxDailyPrice?: number;
  sort?: ListingSort;
}

export interface RentalMineQuery extends PageQuery {
  status?: RentalStatus;
}

/* ------------------------------------------------------------------ */
/* 实体 DTO                                                            */
/* ------------------------------------------------------------------ */

/** 用户（对外，不含 openid/session_key 等敏感字段） */
export interface UserDTO {
  id: string;
  nickname: string;
  avatar: string | null;
  role: UserRole;
  verifyStatus: VerifyStatus;
  /** 校园认证通过后填充的学校/学院信息 */
  school: string | null;
  studentId: string | null;
  createdAt: string;
}

/** 挂牌公开展示用的用户摘要，不含学号等个人资料 */
export type UserSummaryDTO = Pick<
  UserDTO,
  "id" | "nickname" | "avatar" | "verifyStatus"
>;

/** 分类 */
export interface CategoryDTO {
  id: string;
  name: string;
  parentId: string | null;
  sort: number;
  icon: string | null;
}

export interface CategoryTreeDTO extends CategoryDTO {
  children: CategoryTreeDTO[];
}

/** 二手商品 */
export interface ProductDTO {
  id: string;
  title: string;
  description: string;
  /** 售价，单位分 */
  price: number;
  condition: ProductCondition;
  status: ProductStatus;
  images: string[];
  categoryId: string;
  sellerId: string;
  seller?: UserSummaryDTO;
  category?: CategoryDTO;
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 闲置租借物品 */
export interface RentalItemDTO {
  id: string;
  title: string;
  description: string;
  /** 日租金，单位分 */
  dailyPrice: number;
  /** 押金，单位分 */
  deposit: number;
  minDays: number;
  maxDays: number | null;
  rentalStatus: RentalStatus;
  images: string[];
  categoryId: string;
  ownerId: string;
  owner?: UserSummaryDTO;
  category?: CategoryDTO;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 交易订单 */
export interface OrderDTO {
  id: string;
  productId: string;
  product?: ProductDTO;
  buyerId: string;
  sellerId: string;
  /** 成交金额，单位分 */
  amount: number;
  status: OrderStatus;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 租借订单 */
export interface RentalOrderDTO {
  id: string;
  rentalItemId: string;
  rentalItem?: RentalItemDTO;
  renterId: string;
  ownerId: string;
  /** 下单时的日租金快照，单位分 */
  dailyPrice: number;
  /** 押金快照，单位分 */
  deposit: number;
  startDate: string;
  endDate: string;
  days: number;
  /** 租金 = dailyPrice * days，单位分 */
  rentFee: number;
  /** 应付总额 = rentFee + deposit，单位分 */
  totalAmount: number;
  status: RentalOrderStatus;
  createdAt: string;
  updatedAt: string;
}

/** 收藏 */
export interface FavoriteDTO {
  id: string;
  userId: string;
  listingType: ListingType;
  /** 关联 ProductDTO.id 或 RentalItemDTO.id */
  targetId: string;
  createdAt: string;
}

/** 收藏列表项：内嵌唯一一种挂牌 */
export interface FavoriteItemDTO {
  id: string;
  userId: string;
  listingType: ListingType;
  targetId: string;
  createdAt: string;
  product?: ProductDTO;
  rentalItem?: RentalItemDTO;
}

/** 会话 */
export interface ConversationDTO {
  id: string;
  /** 会话双方用户 id */
  userAId: string;
  userBId: string;
  /** 可选：会话关联的挂牌 */
  listingType: ListingType | null;
  listingId: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
}

/** 会话列表项：含对方摘要与未读数 */
export interface ConversationListItemDTO extends ConversationDTO {
  peer: UserSummaryDTO;
  unreadCount: number;
}

export interface ConversationListResponse
  extends Paginated<ConversationListItemDTO> {
  serverTime: string;
}

export interface MessageListResponse extends Paginated<MessageDTO> {
  serverTime: string;
  markedReadCount: number;
}

/** 站内消息 */
export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  read: boolean;
  createdAt: string;
}

/** 举报 */
export interface ReportDTO {
  id: string;
  reporterId: string;
  /** 被举报对象类型标识，如 "PRODUCT" | "RENTAL" | "USER" | "MESSAGE" */
  targetType: string;
  targetId: string;
  reason: string;
  status: ReportStatus;
  handlerId: string | null;
  handleRemark: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* 常用输入型                                                          */
/* ------------------------------------------------------------------ */

/** 登录/注册成功返回的令牌与用户 */
export interface AuthTokenResult {
  token: string;
  tokenType: "Bearer";
  user: UserDTO;
}

/** 账号密码注册 */
export interface RegisterInput {
  username: string;
  password: string;
  nickname?: string;
}

/** 账号密码登录 */
export interface PasswordLoginInput {
  username: string;
  password: string;
}

/** 开发一键登录（可选指定用户名） */
export interface DevLoginInput {
  username?: string;
}

export interface UpdateProfileInput {
  nickname?: string;
  avatar?: string | null;
}

export interface VerifySubmitInput {
  school: string;
  studentId: string;
  proofImages: string[];
}

export interface CreateProductInput {
  title: string;
  description: string;
  price: number;
  condition: ProductCondition;
  images: string[];
  categoryId: string;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface CreateRentalItemInput {
  title: string;
  description: string;
  dailyPrice: number;
  deposit: number;
  minDays: number;
  maxDays?: number | null;
  images: string[];
  categoryId: string;
}

export type UpdateRentalItemInput = Partial<CreateRentalItemInput>;

export interface CreateOrderInput {
  productId: string;
  remark?: string;
}

export interface CreateRentalOrderInput {
  rentalItemId: string;
  startDate: string;
  endDate: string;
}

export interface OrderListQuery extends PageQuery {
  role: "buyer" | "seller";
  status?: OrderStatus;
}

export interface RentalOrderListQuery extends PageQuery {
  role: "renter" | "owner";
  status?: RentalOrderStatus;
}

export interface FavoriteListQuery extends PageQuery {
  listingType?: ListingType;
}

export interface ToggleFavoriteInput {
  listingType: ListingType;
  targetId: string;
}

export interface ToggleFavoriteResult {
  favorited: boolean;
  favorite?: FavoriteDTO;
}

export interface CreateConversationInput {
  peerId: string;
  listingType?: ListingType;
  listingId?: string;
}

export interface ConversationListQuery extends PageQuery {
  updatedSince?: string;
}

export interface MessageListQuery extends PageQuery {
  after?: string;
  before?: string;
}

export interface SendMessageInput {
  type: MessageType;
  content: string;
}

/** 聊天表情收藏 */
export interface StickerFavoriteDTO {
  id: string;
  kind: StickerFavoriteKind;
  stickerId: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface AddStickerFavoriteInput {
  kind: StickerFavoriteKind;
  /** BUILTIN 时必填 */
  stickerId?: string;
  /** IMAGE 时必填 */
  imageUrl?: string;
}

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}

export type ReportTargetType =
  | "PRODUCT"
  | "RENTAL"
  | "USER"
  | "MESSAGE";

export interface ReportListQuery extends PageQuery {
  status?: ReportStatus;
}

export interface HandleReportInput {
  action: "RESOLVED" | "DISMISSED";
  handleRemark?: string;
}

export interface UploadResult {
  urls: string[];
}

export interface AdminDashboardStats {
  userCount: number;
  productCount: number;
  rentalCount: number;
  orderCount: number;
  pendingVerifyCount: number;
  pendingReportCount: number;
}
