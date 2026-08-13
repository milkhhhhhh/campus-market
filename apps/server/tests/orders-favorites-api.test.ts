import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL = "file:./dev.db";
process.env.JWT_SECRET =
  "orders-favorites-test-secret-at-least-32-characters";

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
  "orders, rental orders, and favorites API contract",
  { timeout: 60_000 },
  async () => {
    const [
      { prisma },
      { signAccessToken },
      ordersRoute,
      orderPayRoute,
      orderCompleteRoute,
      orderCancelRoute,
      rentalOrdersRoute,
      rentalReturnRoute,
      favoritesRoute,
      favoritesToggleRoute,
    ] = await Promise.all([
      import("@/lib/prisma"),
      import("@/lib/auth"),
      import("@/app/api/orders/route"),
      import("@/app/api/orders/[id]/pay/route"),
      import("@/app/api/orders/[id]/complete/route"),
      import("@/app/api/orders/[id]/cancel/route"),
      import("@/app/api/rental-orders/route"),
      import("@/app/api/rental-orders/[id]/return/route"),
      import("@/app/api/favorites/route"),
      import("@/app/api/favorites/toggle/route"),
    ]);

    const sellerId = "test-order-seller";
    const buyerId = "test-order-buyer";
    const otherId = "test-order-other";
    const categoryId = "test-order-category";
    const productId = "test-order-product";
    const rentalId = "test-order-rental";
    const prefix = "test-order-";

    const cleanup = async () => {
      await prisma.favorite.deleteMany({
        where: {
          OR: [
            { userId: { in: [sellerId, buyerId, otherId] } },
            { id: { startsWith: prefix } },
          ],
        },
      });
      await prisma.order.deleteMany({
        where: {
          OR: [
            { buyerId: { in: [sellerId, buyerId, otherId] } },
            { sellerId: { in: [sellerId, buyerId, otherId] } },
            { id: { startsWith: prefix } },
          ],
        },
      });
      await prisma.rentalOrder.deleteMany({
        where: {
          OR: [
            { renterId: { in: [sellerId, buyerId, otherId] } },
            { ownerId: { in: [sellerId, buyerId, otherId] } },
            { id: { startsWith: prefix } },
          ],
        },
      });
      await prisma.product.deleteMany({
        where: {
          OR: [
            { sellerId: { in: [sellerId, buyerId, otherId] } },
            { id: productId },
          ],
        },
      });
      await prisma.rentalItem.deleteMany({
        where: {
          OR: [
            { ownerId: { in: [sellerId, buyerId, otherId] } },
            { id: rentalId },
          ],
        },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [sellerId, buyerId, otherId] } },
      });
      await prisma.category.deleteMany({ where: { id: categoryId } });
    };

    await cleanup();
    await prisma.category.create({
      data: { id: categoryId, name: "订单测试分类", sort: 998 },
    });
    const seller = await prisma.user.create({
      data: {
        id: sellerId,
        openId: "test-order-seller-openid",
        nickname: "卖家",
      },
    });
    const buyer = await prisma.user.create({
      data: {
        id: buyerId,
        openId: "test-order-buyer-openid",
        nickname: "买家",
      },
    });
    const other = await prisma.user.create({
      data: {
        id: otherId,
        openId: "test-order-other-openid",
        nickname: "路人",
      },
    });
    const sellerToken = signAccessToken(seller);
    const buyerToken = signAccessToken(buyer);
    const otherToken = signAccessToken(other);

    await prisma.product.create({
      data: {
        id: productId,
        title: "订单测试商品",
        description: "用于订单接口测试",
        price: 5000,
        condition: "GOOD",
        status: "ON_SALE",
        images: "[]",
        categoryId,
        sellerId,
      },
    });
    await prisma.rentalItem.create({
      data: {
        id: rentalId,
        title: "订单测试租借物",
        description: "用于租借订单测试",
        dailyPrice: 1000,
        deposit: 5000,
        minDays: 1,
        maxDays: 7,
        rentalStatus: "AVAILABLE",
        images: "[]",
        categoryId,
        ownerId: sellerId,
      },
    });

    try {
      const selfBuy = await expectStatus(
        await ordersRoute.POST(
          request(
            "http://localhost/api/orders",
            "POST",
            { productId },
            sellerToken,
          ),
        ),
        422,
      );
      assert.equal(selfBuy.error?.code, "CANNOT_BUY_OWN_PRODUCT");

      const created = await expectStatus(
        await ordersRoute.POST(
          request(
            "http://localhost/api/orders",
            "POST",
            { productId, remark: "测试下单" },
            buyerToken,
          ),
        ),
        201,
      );
      const orderId = created.data!.id as string;
      assert.equal(created.data!.status, "PENDING");
      assert.equal(created.data!.amount, 5000);

      const lockedProduct = await prisma.product.findUnique({
        where: { id: productId },
      });
      assert.equal(lockedProduct?.status, "LOCKED");

      const duplicate = await expectStatus(
        await ordersRoute.POST(
          request(
            "http://localhost/api/orders",
            "POST",
            { productId },
            otherToken,
          ),
        ),
        409,
      );
      assert.equal(duplicate.error?.code, "PRODUCT_NOT_AVAILABLE");

      const payCtx = { params: Promise.resolve({ id: orderId }) };
      const paid = await expectStatus(
        await orderPayRoute.POST(
          request(
            `http://localhost/api/orders/${orderId}/pay`,
            "POST",
            {},
            buyerToken,
          ),
          payCtx,
        ),
        200,
      );
      assert.equal(paid.data!.status, "PAID");

      const payAgain = await expectStatus(
        await orderPayRoute.POST(
          request(
            `http://localhost/api/orders/${orderId}/pay`,
            "POST",
            {},
            buyerToken,
          ),
          payCtx,
        ),
        200,
      );
      assert.equal(payAgain.data!.status, "PAID");

      const cancelPaidDenied = await expectStatus(
        await orderCancelRoute.POST(
          request(
            `http://localhost/api/orders/${orderId}/cancel`,
            "POST",
            {},
            buyerToken,
          ),
          payCtx,
        ),
        409,
      );
      assert.equal(cancelPaidDenied.error?.code, "ORDER_STATUS_CONFLICT");

      const sellerPayDenied = await expectStatus(
        await orderPayRoute.POST(
          request(
            `http://localhost/api/orders/${orderId}/pay`,
            "POST",
            {},
            sellerToken,
          ),
          payCtx,
        ),
        403,
      );
      assert.equal(sellerPayDenied.error?.code, "FORBIDDEN");

      const completeCtx = { params: Promise.resolve({ id: orderId }) };
      const completed = await expectStatus(
        await orderCompleteRoute.POST(
          request(
            `http://localhost/api/orders/${orderId}/complete`,
            "POST",
            {},
            buyerToken,
          ),
          completeCtx,
        ),
        200,
      );
      assert.equal(completed.data!.status, "COMPLETED");

      const soldProduct = await prisma.product.findUnique({
        where: { id: productId },
      });
      assert.equal(soldProduct?.status, "SOLD");

      const completeAgain = await expectStatus(
        await orderCompleteRoute.POST(
          request(
            `http://localhost/api/orders/${orderId}/complete`,
            "POST",
            {},
            buyerToken,
          ),
          completeCtx,
        ),
        200,
      );
      assert.equal(completeAgain.data!.status, "COMPLETED");

      await prisma.product.update({
        where: { id: productId },
        data: { status: "ON_SALE" },
      });
      const cancelProductId = "test-order-cancel-product";
      await prisma.product.create({
        data: {
          id: cancelProductId,
          title: "取消测试商品",
          description: "测试取消流程",
          price: 3000,
          condition: "GOOD",
          status: "ON_SALE",
          images: "[]",
          categoryId,
          sellerId,
        },
      });
      const cancelCreated = await expectStatus(
        await ordersRoute.POST(
          request(
            "http://localhost/api/orders",
            "POST",
            { productId: cancelProductId },
            buyerToken,
          ),
        ),
        201,
      );
      const cancelOrderId = cancelCreated.data!.id as string;
      const cancelCtx = {
        params: Promise.resolve({ id: cancelOrderId }),
      };

      const cancelled = await expectStatus(
        await orderCancelRoute.POST(
          request(
            `http://localhost/api/orders/${cancelOrderId}/cancel`,
            "POST",
            {},
            sellerToken,
          ),
          cancelCtx,
        ),
        200,
      );
      assert.equal(cancelled.data!.status, "CANCELLED");

      const restored = await prisma.product.findUnique({
        where: { id: cancelProductId },
      });
      assert.equal(restored?.status, "ON_SALE");

      const buyerList = await expectStatus(
        await ordersRoute.GET(
          request(
            "http://localhost/api/orders?role=buyer&page=1&pageSize=10",
            "GET",
            undefined,
            buyerToken,
          ),
        ),
        200,
      );
      assert.ok((buyerList.data!.total as number) >= 2);
      assert.ok(
        (buyerList.data!.items as unknown[]).every(
          (item) =>
            (item as { buyerId: string }).buyerId === buyerId,
        ),
      );

      const sellerList = await expectStatus(
        await ordersRoute.GET(
          request(
            "http://localhost/api/orders?role=seller&status=COMPLETED",
            "GET",
            undefined,
            sellerToken,
          ),
        ),
        200,
      );
      assert.ok(
        (sellerList.data!.items as Array<{ id: string }>).some(
          (item) => item.id === orderId,
        ),
      );

      const rentalCreated = await expectStatus(
        await rentalOrdersRoute.POST(
          request(
            "http://localhost/api/rental-orders",
            "POST",
            {
              rentalItemId: rentalId,
              startDate: "2026-12-01",
              endDate: "2026-12-03",
            },
            buyerToken,
          ),
        ),
        201,
      );
      const rentalOrderId = rentalCreated.data!.id as string;
      assert.equal(rentalCreated.data!.status, "IN_USE");
      assert.equal(rentalCreated.data!.days, 3);
      assert.equal(rentalCreated.data!.rentFee, 3000);
      assert.equal(rentalCreated.data!.totalAmount, 8000);

      const rentedItem = await prisma.rentalItem.findUnique({
        where: { id: rentalId },
      });
      assert.equal(rentedItem?.rentalStatus, "RENTED");

      const selfRent = await expectStatus(
        await rentalOrdersRoute.POST(
          request(
            "http://localhost/api/rental-orders",
            "POST",
            {
              rentalItemId: rentalId,
              startDate: "2026-12-10",
              endDate: "2026-12-11",
            },
            sellerToken,
          ),
        ),
        422,
      );
      assert.equal(selfRent.error?.code, "CANNOT_RENT_OWN_ITEM");

      const returnCtx = {
        params: Promise.resolve({ id: rentalOrderId }),
      };
      const returned = await expectStatus(
        await rentalReturnRoute.POST(
          request(
            `http://localhost/api/rental-orders/${rentalOrderId}/return`,
            "POST",
            {},
            buyerToken,
          ),
          returnCtx,
        ),
        200,
      );
      assert.equal(returned.data!.status, "RETURNED");

      const availableItem = await prisma.rentalItem.findUnique({
        where: { id: rentalId },
      });
      assert.equal(availableItem?.rentalStatus, "AVAILABLE");

      const rentFavorited = await expectStatus(
        await favoritesToggleRoute.POST(
          request(
            "http://localhost/api/favorites/toggle",
            "POST",
            { listingType: "RENT", targetId: rentalId },
            buyerToken,
          ),
        ),
        200,
      );
      assert.equal(rentFavorited.data!.favorited, true);
      assert.ok(rentFavorited.data!.favorite);

      const rentUnfavorited = await expectStatus(
        await favoritesToggleRoute.POST(
          request(
            "http://localhost/api/favorites/toggle",
            "POST",
            { listingType: "RENT", targetId: rentalId },
            buyerToken,
          ),
        ),
        200,
      );
      assert.equal(rentUnfavorited.data!.favorited, false);

      const returnAgain = await expectStatus(
        await rentalReturnRoute.POST(
          request(
            `http://localhost/api/rental-orders/${rentalOrderId}/return`,
            "POST",
            {},
            buyerToken,
          ),
          returnCtx,
        ),
        200,
      );
      assert.equal(returnAgain.data!.status, "RETURNED");

      const renterList = await expectStatus(
        await rentalOrdersRoute.GET(
          request(
            "http://localhost/api/rental-orders?role=renter",
            "GET",
            undefined,
            buyerToken,
          ),
        ),
        200,
      );
      assert.ok((renterList.data!.total as number) >= 1);

      const favoriteProductId = cancelProductId;
      const favorited = await expectStatus(
        await favoritesToggleRoute.POST(
          request(
            "http://localhost/api/favorites/toggle",
            "POST",
            { listingType: "SALE", targetId: favoriteProductId },
            buyerToken,
          ),
        ),
        200,
      );
      assert.equal(favorited.data!.favorited, true);
      assert.ok(favorited.data!.favorite);

      const productAfterFavorite = await prisma.product.findUnique({
        where: { id: favoriteProductId },
      });
      assert.equal(productAfterFavorite?.favoriteCount, 1);

      const unfavorited = await expectStatus(
        await favoritesToggleRoute.POST(
          request(
            "http://localhost/api/favorites/toggle",
            "POST",
            { listingType: "SALE", targetId: favoriteProductId },
            buyerToken,
          ),
        ),
        200,
      );
      assert.equal(unfavorited.data!.favorited, false);

      const productAfterUnfavorite = await prisma.product.findUnique({
        where: { id: favoriteProductId },
      });
      assert.equal(productAfterUnfavorite?.favoriteCount, 0);

      await favoritesToggleRoute.POST(
        request(
          "http://localhost/api/favorites/toggle",
          "POST",
          { listingType: "SALE", targetId: favoriteProductId },
          buyerToken,
        ),
      );
      await prisma.product.update({
        where: { id: favoriteProductId },
        data: { status: "OFF_SHELF" },
      });

      const favoriteList = await expectStatus(
        await favoritesRoute.GET(
          request(
            "http://localhost/api/favorites?page=1&pageSize=10",
            "GET",
            undefined,
            buyerToken,
          ),
        ),
        200,
      );
      assert.equal(favoriteList.data!.total, 0);
      assert.equal(
        (favoriteList.data!.items as unknown[]).length,
        0,
      );

      const cleanedProduct = await prisma.product.findUnique({
        where: { id: favoriteProductId },
      });
      assert.equal(cleanedProduct?.favoriteCount, 0);
    } finally {
      await cleanup();
    }
  },
);
