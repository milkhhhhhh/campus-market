/**
 * 全平台 API 路径常量，前后端唯一事实来源。
 * 含参路径用函数生成；静态路径用 `as const` 固定字面量类型。
 */

export const AUTH = {
  /** 开发环境一键登录（非 production） */
  devLogin: "/api/auth/dev-login",
  /** 账号密码注册 */
  register: "/api/auth/register",
  /** 账号密码登录 */
  login: "/api/auth/login",
  /** 当前用户资料（查询 / 修改） */
  profile: "/api/auth/profile",
  /** 提交校园认证 */
  verifySubmit: "/api/auth/verify",
} as const;

export const PRODUCTS = {
  list: "/api/products",
  create: "/api/products",
  mine: "/api/products/mine",
  detail: (id: string) => `/api/products/${id}`,
  update: (id: string) => `/api/products/${id}`,
  remove: (id: string) => `/api/products/${id}`,
} as const;

export const RENTALS = {
  list: "/api/rentals",
  create: "/api/rentals",
  mine: "/api/rentals/mine",
  detail: (id: string) => `/api/rentals/${id}`,
  update: (id: string) => `/api/rentals/${id}`,
  remove: (id: string) => `/api/rentals/${id}`,
} as const;

export const ORDERS = {
  list: "/api/orders",
  create: "/api/orders",
  pay: (id: string) => `/api/orders/${id}/pay`,
  complete: (id: string) => `/api/orders/${id}/complete`,
  cancel: (id: string) => `/api/orders/${id}/cancel`,
} as const;

export const RENTAL_ORDERS = {
  list: "/api/rental-orders",
  create: "/api/rental-orders",
  return: (id: string) => `/api/rental-orders/${id}/return`,
} as const;

export const CATEGORIES = {
  list: "/api/categories",
  detail: (id: string) => `/api/categories/${id}`,
} as const;

export const SEARCH = {
  /** 综合搜索（商品 + 租借） */
  query: "/api/search",
} as const;

export const FAVORITES = {
  list: "/api/favorites",
  toggle: "/api/favorites/toggle",
} as const;

export const CHAT = {
  conversations: "/api/chat/conversations",
  messages: (conversationId: string) =>
    `/api/chat/conversations/${conversationId}/messages`,
  stickerFavorites: "/api/chat/sticker-favorites",
  stickerFavoriteDetail: (id: string) =>
    `/api/chat/sticker-favorites/${id}`,
} as const;

export const REPORTS = {
  create: "/api/reports",
} as const;

export const UPLOAD = {
  /** 上传图片等静态资源 */
  file: "/api/upload",
} as const;

export const DEVICES = {
  /** 注册/更新推送设备令牌 */
  register: "/api/devices/register",
} as const;

export const ADMIN = {
  /** 管理后台账号密码登录（设置 session cookie） */
  login: "/api/admin/auth/login",
  users: "/api/admin/users",
  userDetail: (id: string) => `/api/admin/users/${id}`,
  /** 校园认证审核 */
  verifyReview: (userId: string) => `/api/admin/users/${userId}/verify`,
  products: "/api/admin/products",
  rentals: "/api/admin/rentals",
  orders: "/api/admin/orders",
  rentalOrders: "/api/admin/rental-orders",
  categories: "/api/admin/categories",
  categoryDetail: (id: string) => `/api/admin/categories/${id}`,
  reports: "/api/admin/reports",
  /** 举报处理 */
  reportHandle: (id: string) => `/api/admin/reports/${id}/handle`,
} as const;

/** 汇总，便于按需整体引用 */
export const API_ROUTES = {
  AUTH,
  PRODUCTS,
  RENTALS,
  ORDERS,
  RENTAL_ORDERS,
  CATEGORIES,
  SEARCH,
  FAVORITES,
  CHAT,
  REPORTS,
  UPLOAD,
  DEVICES,
  ADMIN,
} as const;
