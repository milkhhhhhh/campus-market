import bcrypt from "bcryptjs";
import {
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
} from "@campus/shared";
import { prisma, serializeImages } from "../src/index";

/** 默认分类树：顶级分类 + 子分类。id 固定以保证 upsert 幂等。 */
const CATEGORY_TREE: Array<{
  id: string;
  name: string;
  sort: number;
  children: Array<{ id: string; name: string; sort: number }>;
}> = [
  {
    id: "cat-book",
    name: "教材书籍",
    sort: 1,
    children: [
      { id: "cat-book-textbook", name: "专业教材", sort: 1 },
      { id: "cat-book-exam", name: "考研考证", sort: 2 },
      { id: "cat-book-novel", name: "文学小说", sort: 3 },
    ],
  },
  {
    id: "cat-digital",
    name: "电子数码",
    sort: 2,
    children: [
      { id: "cat-digital-phone", name: "手机平板", sort: 1 },
      { id: "cat-digital-computer", name: "电脑配件", sort: 2 },
      { id: "cat-digital-accessory", name: "数码配件", sort: 3 },
    ],
  },
  {
    id: "cat-life",
    name: "生活用品",
    sort: 3,
    children: [
      { id: "cat-life-daily", name: "日用百货", sort: 1 },
      { id: "cat-life-furniture", name: "宿舍家居", sort: 2 },
    ],
  },
  {
    id: "cat-cloth",
    name: "服饰鞋包",
    sort: 4,
    children: [
      { id: "cat-cloth-clothes", name: "服装", sort: 1 },
      { id: "cat-cloth-shoes", name: "鞋靴", sort: 2 },
    ],
  },
  {
    id: "cat-sport",
    name: "运动户外",
    sort: 5,
    children: [
      { id: "cat-sport-fitness", name: "健身器材", sort: 1 },
      { id: "cat-sport-bike", name: "自行车", sort: 2 },
    ],
  },
];

async function seedCategories() {
  for (const top of CATEGORY_TREE) {
    await prisma.category.upsert({
      where: { id: top.id },
      update: { name: top.name, sort: top.sort, parentId: null },
      create: { id: top.id, name: top.name, sort: top.sort },
    });
    for (const child of top.children) {
      await prisma.category.upsert({
        where: { id: child.id },
        update: { name: child.name, sort: child.sort, parentId: top.id },
        create: {
          id: child.id,
          name: child.name,
          sort: child.sort,
          parentId: top.id,
        },
      });
    }
  }
}

async function seedUsers() {
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { openId: "seed-admin-openid" },
    update: {
      nickname: "平台管理员",
      role: UserRole.ADMIN,
      verifyStatus: VerifyStatus.APPROVED,
      adminUsername: "admin",
      passwordHash: adminPasswordHash,
      banned: false,
    },
    create: {
      openId: "seed-admin-openid",
      nickname: "平台管理员",
      avatar: null,
      role: UserRole.ADMIN,
      verifyStatus: VerifyStatus.APPROVED,
      school: "示范大学",
      studentId: "ADMIN0001",
      adminUsername: "admin",
      passwordHash: adminPasswordHash,
      banned: false,
    },
  });

  const seller = await prisma.user.upsert({
    where: { openId: "seed-seller-openid" },
    update: { nickname: "卖家小明", verifyStatus: VerifyStatus.APPROVED },
    create: {
      openId: "seed-seller-openid",
      nickname: "卖家小明",
      role: UserRole.STUDENT,
      verifyStatus: VerifyStatus.APPROVED,
      school: "示范大学",
      studentId: "2021000001",
    },
  });

  const buyer = await prisma.user.upsert({
    where: { openId: "seed-buyer-openid" },
    update: { nickname: "买家小红" },
    create: {
      openId: "seed-buyer-openid",
      nickname: "买家小红",
      role: UserRole.STUDENT,
      verifyStatus: VerifyStatus.PENDING,
      school: "示范大学",
      studentId: "2021000002",
    },
  });

  return { admin, seller, buyer };
}

async function seedListings(sellerId: string) {
  await prisma.product.upsert({
    where: { id: "seed-product-1" },
    update: {
      title: "九成新数据结构教材",
      description: "考研用书，几乎全新，无笔记。",
      price: 2500,
      condition: ProductCondition.LIKE_NEW,
      status: ProductStatus.LOCKED,
      categoryId: "cat-book-textbook",
      sellerId,
    },
    create: {
      id: "seed-product-1",
      title: "九成新数据结构教材",
      description: "考研用书，几乎全新，无笔记。",
      price: 2500,
      condition: ProductCondition.LIKE_NEW,
      status: ProductStatus.LOCKED,
      images: serializeImages([]),
      categoryId: "cat-book-textbook",
      sellerId,
    },
  });

  await prisma.product.upsert({
    where: { id: "seed-product-2" },
    update: {
      title: "二手机械键盘",
      description: "红轴，手感良好，含数据线。",
      price: 12000,
      condition: ProductCondition.GOOD,
      status: ProductStatus.ON_SALE,
      categoryId: "cat-digital-accessory",
      sellerId,
    },
    create: {
      id: "seed-product-2",
      title: "二手机械键盘",
      description: "红轴，手感良好，含数据线。",
      price: 12000,
      condition: ProductCondition.GOOD,
      status: ProductStatus.ON_SALE,
      images: serializeImages([]),
      categoryId: "cat-digital-accessory",
      sellerId,
    },
  });

  await prisma.rentalItem.upsert({
    where: { id: "seed-rental-1" },
    update: {
      title: "出租山地自行车",
      description: "按日出租，需押金，校内自提。",
      dailyPrice: 1000,
      deposit: 20000,
      minDays: 1,
      maxDays: 30,
      rentalStatus: RentalStatus.RENTED,
      categoryId: "cat-sport-bike",
      ownerId: sellerId,
    },
    create: {
      id: "seed-rental-1",
      title: "出租山地自行车",
      description: "按日出租，需押金，校内自提。",
      dailyPrice: 1000,
      deposit: 20000,
      minDays: 1,
      maxDays: 30,
      rentalStatus: RentalStatus.RENTED,
      images: serializeImages([]),
      categoryId: "cat-sport-bike",
      ownerId: sellerId,
    },
  });
}

async function seedTransactionsAndCommunity(
  adminId: string,
  sellerId: string,
  buyerId: string,
) {
  await prisma.order.upsert({
    where: { id: "seed-order-1" },
    update: {
      buyerId,
      sellerId,
      productId: "seed-product-1",
      amount: 2500,
      status: OrderStatus.PENDING,
    },
    create: {
      id: "seed-order-1",
      buyerId,
      sellerId,
      productId: "seed-product-1",
      amount: 2500,
      status: OrderStatus.PENDING,
      remark: "校内当面交易",
    },
  });

  const startDate = new Date("2026-08-01T00:00:00.000Z");
  const endDate = new Date("2026-08-03T00:00:00.000Z");
  await prisma.rentalOrder.upsert({
    where: { id: "seed-rental-order-1" },
    update: {
      renterId: buyerId,
      ownerId: sellerId,
      rentalItemId: "seed-rental-1",
      dailyPrice: 1000,
      deposit: 20000,
      startDate,
      endDate,
      days: 3,
      totalAmount: 23000,
      status: RentalOrderStatus.IN_USE,
    },
    create: {
      id: "seed-rental-order-1",
      renterId: buyerId,
      ownerId: sellerId,
      rentalItemId: "seed-rental-1",
      dailyPrice: 1000,
      deposit: 20000,
      startDate,
      endDate,
      days: 3,
      totalAmount: 23000,
      status: RentalOrderStatus.IN_USE,
    },
  });

  await prisma.product.update({
    where: { id: "seed-product-2" },
    data: { favoriteCount: { increment: 1 } },
  });

  await prisma.favorite.upsert({
    where: { id: "seed-favorite-1" },
    update: {
      userId: buyerId,
      listingType: ListingType.SALE,
      targetId: "seed-product-2",
    },
    create: {
      id: "seed-favorite-1",
      userId: buyerId,
      listingType: ListingType.SALE,
      targetId: "seed-product-2",
    },
  });

  const conversation = await prisma.conversation.upsert({
    where: { id: "seed-conversation-1" },
    update: {
      userAId: buyerId,
      userBId: sellerId,
      listingType: ListingType.SALE,
      listingId: "seed-product-2",
      contextKey: `${ListingType.SALE}:seed-product-2`,
      lastMessage: "键盘还在吗？",
      lastMessageAt: new Date("2026-07-01T10:00:00.000Z"),
    },
    create: {
      id: "seed-conversation-1",
      userAId: buyerId,
      userBId: sellerId,
      listingType: ListingType.SALE,
      listingId: "seed-product-2",
      contextKey: `${ListingType.SALE}:seed-product-2`,
      lastMessage: "键盘还在吗？",
      lastMessageAt: new Date("2026-07-01T10:00:00.000Z"),
    },
  });

  await prisma.message.upsert({
    where: { id: "seed-message-1" },
    update: {
      conversationId: conversation.id,
      senderId: buyerId,
      type: MessageType.TEXT,
      content: "键盘还在吗？",
    },
    create: {
      id: "seed-message-1",
      conversationId: conversation.id,
      senderId: buyerId,
      type: MessageType.TEXT,
      content: "键盘还在吗？",
    },
  });

  await prisma.report.upsert({
    where: { id: "seed-report-1" },
    update: {
      reporterId: buyerId,
      targetType: "PRODUCT",
      targetId: "seed-product-2",
      reason: "测试举报：商品描述需要核验",
      status: ReportStatus.REVIEWING,
      handlerId: adminId,
    },
    create: {
      id: "seed-report-1",
      reporterId: buyerId,
      targetType: "PRODUCT",
      targetId: "seed-product-2",
      reason: "测试举报：商品描述需要核验",
      status: ReportStatus.REVIEWING,
      handlerId: adminId,
    },
  });
}

async function main() {
  await seedCategories();
  const { admin, seller, buyer } = await seedUsers();
  await seedListings(seller.id);
  await seedTransactionsAndCommunity(admin.id, seller.id, buyer.id);
  console.log("Seed 完成：分类树、用户、挂牌、订单、收藏、会话、消息与举报已写入。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
