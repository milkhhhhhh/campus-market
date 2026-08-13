import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL = "file:./dev.db";
process.env.JWT_SECRET =
  "chat-reports-test-secret-at-least-32-characters";

interface ApiEnvelope {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code?: string };
}

function request(
  url: string,
  method = "GET",
  body?: Record<string, unknown>,
  token?: string,
): Request {
  return new Request(url, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function responseBody(response: Response): Promise<ApiEnvelope> {
  return (await response.json()) as ApiEnvelope;
}

async function expectStatus(
  response: Response,
  status: number,
): Promise<ApiEnvelope> {
  const body = await responseBody(response);
  assert.equal(response.status, status, JSON.stringify(body));
  return body;
}

test(
  "chat and reports API contract",
  { timeout: 60_000 },
  async () => {
    const [
      { prisma },
      { signAccessToken },
      conversationsRoute,
      messagesRoute,
      reportsRoute,
      adminReportsRoute,
      adminReportHandleRoute,
    ] = await Promise.all([
      import("@/lib/prisma"),
      import("@/lib/auth"),
      import("@/app/api/chat/conversations/route"),
      import("@/app/api/chat/conversations/[id]/messages/route"),
      import("@/app/api/reports/route"),
      import("@/app/api/admin/reports/route"),
      import("@/app/api/admin/reports/[id]/handle/route"),
    ]);

    const userAId = "test-chat-user-a";
    const userBId = "test-chat-user-b";
    const adminId = "test-chat-admin";
    const categoryId = "test-chat-category";
    const productId = "test-chat-product";
    const prefix = "test-chat-";

    const cleanup = async () => {
      await prisma.message.deleteMany({
        where: {
          OR: [
            { senderId: { in: [userAId, userBId, adminId] } },
            { id: { startsWith: prefix } },
          ],
        },
      });
      await prisma.conversation.deleteMany({
        where: {
          OR: [
            { userAId: { in: [userAId, userBId, adminId] } },
            { userBId: { in: [userAId, userBId, adminId] } },
            { id: { startsWith: prefix } },
          ],
        },
      });
      await prisma.report.deleteMany({
        where: {
          OR: [
            { reporterId: { in: [userAId, userBId, adminId] } },
            { id: { startsWith: prefix } },
          ],
        },
      });
      await prisma.product.deleteMany({
        where: {
          OR: [{ id: productId }, { sellerId: userAId }],
        },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userAId, userBId, adminId] } },
      });
      await prisma.category.deleteMany({ where: { id: categoryId } });
    };

    await cleanup();
    await prisma.category.create({
      data: { id: categoryId, name: "聊天测试分类", sort: 997 },
    });
    const userA = await prisma.user.create({
      data: {
        id: userAId,
        openId: "test-chat-a-openid",
        nickname: "聊天用户A",
      },
    });
    const userB = await prisma.user.create({
      data: {
        id: userBId,
        openId: "test-chat-b-openid",
        nickname: "聊天用户B",
      },
    });
    const admin = await prisma.user.create({
      data: {
        id: adminId,
        openId: "test-chat-admin-openid",
        nickname: "聊天管理员",
        role: "ADMIN",
      },
    });
    await prisma.product.create({
      data: {
        id: productId,
        title: "聊天测试商品",
        description: "用于举报测试",
        price: 1000,
        condition: "GOOD",
        status: "ON_SALE",
        images: "[]",
        categoryId,
        sellerId: userAId,
      },
    });

    const tokenA = signAccessToken(userA);
    const tokenB = signAccessToken(userB);
    const tokenAdmin = signAccessToken(admin);

    try {
      const selfChat = await expectStatus(
        await conversationsRoute.POST(
          request(
            "http://localhost/api/chat/conversations",
            "POST",
            { peerId: userAId },
            tokenA,
          ),
        ),
        422,
      );
      assert.equal(selfChat.error?.code, "CANNOT_CHAT_WITH_SELF");

      const created = await expectStatus(
        await conversationsRoute.POST(
          request(
            "http://localhost/api/chat/conversations",
            "POST",
            { peerId: userBId },
            tokenA,
          ),
        ),
        201,
      );
      const conversationId = created.data!.id as string;
      assert.equal(created.data!.unreadCount, 0);
      assert.equal(
        (created.data!.peer as { id: string }).id,
        userBId,
      );

      const dedup = await expectStatus(
        await conversationsRoute.POST(
          request(
            "http://localhost/api/chat/conversations",
            "POST",
            { peerId: userAId },
            tokenB,
          ),
        ),
        200,
      );
      assert.equal(dedup.data!.id, conversationId);

      const msgCtx = {
        params: Promise.resolve({ id: conversationId }),
      };
      const sent = await expectStatus(
        await messagesRoute.POST(
          request(
            `http://localhost/api/chat/conversations/${conversationId}/messages`,
            "POST",
            { type: "TEXT", content: "你好，商品还在吗？" },
            tokenA,
          ),
          msgCtx,
        ),
        201,
      );
      const firstMessageId = sent.data!.id as string;

      const conversationAfterSend = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      assert.ok(conversationAfterSend?.lastMessageAt);
      assert.equal(
        conversationAfterSend?.lastMessage,
        "你好，商品还在吗？",
      );

      await messagesRoute.POST(
        request(
          `http://localhost/api/chat/conversations/${conversationId}/messages`,
          "POST",
          { type: "TEXT", content: "在的，可以面交" },
          tokenB,
        ),
        msgCtx,
      );

      const imageSent = await expectStatus(
        await messagesRoute.POST(
          request(
            `http://localhost/api/chat/conversations/${conversationId}/messages`,
            "POST",
            {
              type: "IMAGE",
              content: "https://example.com/chat-test.png",
            },
            tokenA,
          ),
          msgCtx,
        ),
        201,
      );
      assert.equal(imageSent.data!.type, "IMAGE");
      assert.equal(
        imageSent.data!.content,
        "https://example.com/chat-test.png",
      );

      const listForA = await expectStatus(
        await conversationsRoute.GET(
          request(
            "http://localhost/api/chat/conversations?page=1&pageSize=10",
            "GET",
            undefined,
            tokenA,
          ),
        ),
        200,
      );
      assert.ok(listForA.data!.serverTime);
      const convItem = (
        listForA.data!.items as Array<Record<string, unknown>>
      ).find((item) => item.id === conversationId);
      assert.ok(convItem);
      assert.equal(convItem!.unreadCount, 1);
      assert.equal(
        (convItem!.peer as { id: string }).id,
        userBId,
      );

      const fetched = await expectStatus(
        await messagesRoute.GET(
          request(
            `http://localhost/api/chat/conversations/${conversationId}/messages?page=1&pageSize=10`,
            "GET",
            undefined,
            tokenA,
          ),
          msgCtx,
        ),
        200,
      );
      assert.equal(fetched.data!.markedReadCount, 1);
      const fetchedItems = fetched.data!.items as Array<{
        senderId: string;
        read: boolean;
      }>;
      assert.equal(
        fetchedItems.filter((item) => item.senderId === userBId).every(
          (item) => item.read,
        ),
        true,
      );

      const afterFetch = await expectStatus(
        await messagesRoute.GET(
          request(
            `http://localhost/api/chat/conversations/${conversationId}/messages?after=${firstMessageId}`,
            "GET",
            undefined,
            tokenA,
          ),
          msgCtx,
        ),
        200,
      );
      assert.equal(
        (afterFetch.data!.items as unknown[]).length,
        2,
      );
      assert.ok(
        (afterFetch.data!.items as Array<{ type: string }>).some(
          (item) => item.type === "IMAGE",
        ),
      );

      const forbidden = await expectStatus(
        await messagesRoute.GET(
          request(
            `http://localhost/api/chat/conversations/${conversationId}/messages`,
            "GET",
            undefined,
            tokenAdmin,
          ),
          msgCtx,
        ),
        403,
      );
      assert.equal(forbidden.error?.code, "FORBIDDEN");

      const reportCreated = await expectStatus(
        await reportsRoute.POST(
          request(
            "http://localhost/api/reports",
            "POST",
            {
              targetType: "PRODUCT",
              targetId: productId,
              reason: "测试举报商品描述",
            },
            tokenB,
          ),
        ),
        201,
      );
      const reportId = reportCreated.data!.id as string;
      assert.equal(reportCreated.data!.status, "PENDING");

      const adminDenied = await expectStatus(
        await adminReportsRoute.GET(
          request(
            "http://localhost/api/admin/reports",
            "GET",
            undefined,
            tokenB,
          ),
        ),
        403,
      );
      assert.equal(adminDenied.error?.code, "FORBIDDEN");

      const adminList = await expectStatus(
        await adminReportsRoute.GET(
          request(
            "http://localhost/api/admin/reports?status=PENDING",
            "GET",
            undefined,
            tokenAdmin,
          ),
        ),
        200,
      );
      assert.ok(
        (adminList.data!.items as Array<{ id: string }>).some(
          (item) => item.id === reportId,
        ),
      );

      const handleCtx = { params: Promise.resolve({ id: reportId }) };
      const resolved = await expectStatus(
        await adminReportHandleRoute.POST(
          request(
            `http://localhost/api/admin/reports/${reportId}/handle`,
            "POST",
            { action: "RESOLVED", handleRemark: "已核实" },
            tokenAdmin,
          ),
          handleCtx,
        ),
        200,
      );
      assert.equal(resolved.data!.status, "RESOLVED");

      const resolvedAgain = await expectStatus(
        await adminReportHandleRoute.POST(
          request(
            `http://localhost/api/admin/reports/${reportId}/handle`,
            "POST",
            { action: "RESOLVED" },
            tokenAdmin,
          ),
          handleCtx,
        ),
        200,
      );
      assert.equal(resolvedAgain.data!.status, "RESOLVED");

      const reportForDismiss = await expectStatus(
        await reportsRoute.POST(
          request(
            "http://localhost/api/reports",
            "POST",
            {
              targetType: "USER",
              targetId: userAId,
              reason: "测试驳回举报",
            },
            tokenB,
          ),
        ),
        201,
      );
      const dismissId = reportForDismiss.data!.id as string;
      const dismissCtx = {
        params: Promise.resolve({ id: dismissId }),
      };
      const dismissed = await expectStatus(
        await adminReportHandleRoute.POST(
          request(
            `http://localhost/api/admin/reports/${dismissId}/handle`,
            "POST",
            { action: "DISMISSED" },
            tokenAdmin,
          ),
          dismissCtx,
        ),
        200,
      );
      assert.equal(dismissed.data!.status, "DISMISSED");
    } finally {
      await cleanup();
    }
  },
);
