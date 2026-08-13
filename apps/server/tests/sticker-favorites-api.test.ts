import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL = "file:./dev.db";
process.env.JWT_SECRET =
  "sticker-fav-test-secret-at-least-32-characters";

interface ApiEnvelope {
  success: boolean;
  data?: unknown;
  error?: { code?: string; message?: string };
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

async function expectStatus(
  response: Response,
  status: number,
): Promise<ApiEnvelope> {
  const body = (await response.json()) as ApiEnvelope;
  assert.equal(response.status, status, JSON.stringify(body));
  return body;
}

test("sticker message and favorites API", { timeout: 60_000 }, async () => {
  const [{ prisma }, { signAccessToken }, conversationsRoute, messagesRoute, favoritesRoute, favoriteDetailRoute] =
    await Promise.all([
      import("@/lib/prisma"),
      import("@/lib/auth"),
      import("@/app/api/chat/conversations/route"),
      import("@/app/api/chat/conversations/[id]/messages/route"),
      import("@/app/api/chat/sticker-favorites/route"),
      import("@/app/api/chat/sticker-favorites/[id]/route"),
    ]);

  const userAId = "test-sticker-user-a";
  const userBId = "test-sticker-user-b";

  const cleanup = async () => {
    await prisma.stickerFavorite.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
    await prisma.message.deleteMany({
      where: { senderId: { in: [userAId, userBId] } },
    });
    await prisma.conversation.deleteMany({
      where: {
        OR: [
          { userAId: { in: [userAId, userBId] } },
          { userBId: { in: [userAId, userBId] } },
        ],
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });
  };

  await cleanup();
  await prisma.user.createMany({
    data: [
      {
        id: userAId,
        openId: "test-sticker-openid-a",
        nickname: "贴纸甲",
      },
      {
        id: userBId,
        openId: "test-sticker-openid-b",
        nickname: "贴纸乙",
      },
    ],
  });

  const tokenA = signAccessToken({ id: userAId, role: "STUDENT" });
  const tokenB = signAccessToken({ id: userBId, role: "STUDENT" });

  try {
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
    const conversationId = (created.data as { id: string }).id;
    const msgCtx = { params: Promise.resolve({ id: conversationId }) };

    const stickerMsg = await expectStatus(
      await messagesRoute.POST(
        request(
          `http://localhost/api/chat/conversations/${conversationId}/messages`,
          "POST",
          { type: "STICKER", content: "campus/ok" },
          tokenA,
        ),
        msgCtx,
      ),
      201,
    );
    assert.equal((stickerMsg.data as { type: string }).type, "STICKER");

    await expectStatus(
      await messagesRoute.POST(
        request(
          `http://localhost/api/chat/conversations/${conversationId}/messages`,
          "POST",
          { type: "STICKER", content: "campus/unknown" },
          tokenA,
        ),
        msgCtx,
      ),
      422,
    );

    const fav = await expectStatus(
      await favoritesRoute.POST(
        request(
          "http://localhost/api/chat/sticker-favorites",
          "POST",
          { kind: "BUILTIN", stickerId: "campus/ok" },
          tokenB,
        ),
      ),
      201,
    );
    const favId = (fav.data as { id: string }).id;

    const dup = await expectStatus(
      await favoritesRoute.POST(
        request(
          "http://localhost/api/chat/sticker-favorites",
          "POST",
          { kind: "BUILTIN", stickerId: "campus/ok" },
          tokenB,
        ),
      ),
      201,
    );
    assert.equal((dup.data as { id: string }).id, favId);

    const imgFav = await expectStatus(
      await favoritesRoute.POST(
        request(
          "http://localhost/api/chat/sticker-favorites",
          "POST",
          {
            kind: "IMAGE",
            imageUrl: "http://127.0.0.1:3000/uploads/demo.png",
          },
          tokenB,
        ),
      ),
      201,
    );
    assert.equal((imgFav.data as { kind: string }).kind, "IMAGE");

    const list = await expectStatus(
      await favoritesRoute.GET(
        request(
          "http://localhost/api/chat/sticker-favorites",
          "GET",
          undefined,
          tokenB,
        ),
      ),
      200,
    );
    assert.equal((list.data as unknown[]).length, 2);

    await expectStatus(
      await favoriteDetailRoute.DELETE(
        request(
          `http://localhost/api/chat/sticker-favorites/${favId}`,
          "DELETE",
          undefined,
          tokenB,
        ),
        { params: Promise.resolve({ id: favId }) },
      ),
      200,
    );

    const listAfter = await expectStatus(
      await favoritesRoute.GET(
        request(
          "http://localhost/api/chat/sticker-favorites",
          "GET",
          undefined,
          tokenB,
        ),
      ),
      200,
    );
    assert.equal((listAfter.data as unknown[]).length, 1);
  } finally {
    await cleanup();
  }
});
