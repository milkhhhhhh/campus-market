import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL = "file:./dev.db";
process.env.JWT_SECRET = "listings-test-secret-at-least-32-characters";

interface ApiEnvelope {
  success: boolean;
  data?: unknown;
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
  "categories, products, and rentals API contract",
  { timeout: 30_000 },
  async () => {
    const [
      { prisma },
      { signAccessToken },
      categoriesRoute,
      productsRoute,
      productDetailRoute,
      productMineRoute,
      rentalsRoute,
      rentalDetailRoute,
      rentalMineRoute,
    ] = await Promise.all([
      import("@/lib/prisma"),
      import("@/lib/auth"),
      import("@/app/api/categories/route"),
      import("@/app/api/products/route"),
      import("@/app/api/products/[id]/route"),
      import("@/app/api/products/mine/route"),
      import("@/app/api/rentals/route"),
      import("@/app/api/rentals/[id]/route"),
      import("@/app/api/rentals/mine/route"),
    ]);

    const ownerId = "test-listing-owner";
    const otherId = "test-listing-other";
    const categoryId = "test-listing-category";
    const productPrefix = "test-product-";
    const rentalPrefix = "test-rental-";

    const cleanup = async () => {
      await prisma.product.deleteMany({
        where: {
          OR: [
            { sellerId: { in: [ownerId, otherId] } },
            { id: { startsWith: productPrefix } },
          ],
        },
      });
      await prisma.rentalItem.deleteMany({
        where: {
          OR: [
            { ownerId: { in: [ownerId, otherId] } },
            { id: { startsWith: rentalPrefix } },
          ],
        },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, otherId] } },
      });
      await prisma.category.deleteMany({ where: { id: categoryId } });
    };

    await cleanup();
    await prisma.category.create({
      data: {
        id: categoryId,
        name: "挂牌接口测试分类",
        sort: 999,
      },
    });
    const owner = await prisma.user.create({
      data: {
        id: ownerId,
        openId: "test-listing-owner-openid",
        nickname: "挂牌 owner",
      },
    });
    const other = await prisma.user.create({
      data: {
        id: otherId,
        openId: "test-listing-other-openid",
        nickname: "挂牌 other",
      },
    });
    const ownerToken = signAccessToken(owner);
    const otherToken = signAccessToken(other);

    try {
      const categories = await expectStatus(
        await categoriesRoute.GET(),
        200,
      );
      const tree = categories.data as Array<{
        id: string;
        children: unknown[];
      }>;
      assert.ok(tree.some((category) => category.id === categoryId));

      const productInput = {
        title: "测试商品 Alpha",
        description: "用于商品接口筛选测试",
        price: 5000,
        condition: "GOOD",
        images: ["/uploads/demo/product-alpha.jpg"],
        categoryId,
      };
      assert.equal(
        (
          await productsRoute.POST(
            request(
              "http://localhost/api/products",
              "POST",
              productInput,
            ),
          )
        ).status,
        401,
      );
      const createdProductBody = await expectStatus(
        await productsRoute.POST(
          request(
            "http://localhost/api/products",
            "POST",
            productInput,
            ownerToken,
          ),
        ),
        201,
      );
      const createdProduct = createdProductBody.data as {
        id: string;
        status: string;
      };
      assert.equal(createdProduct.status, "ON_SALE");

      await prisma.product.createMany({
        data: [
          {
            id: `${productPrefix}second`,
            title: "测试商品 Beta",
            description: "用于分页测试",
            price: 3000,
            condition: "GOOD",
            status: "ON_SALE",
            images: JSON.stringify(["https://example.com/beta.jpg"]),
            categoryId,
            sellerId: ownerId,
          },
          {
            id: `${productPrefix}hidden`,
            title: "测试商品 Hidden",
            description: "不应出现在公开列表",
            price: 1000,
            condition: "GOOD",
            status: "OFF_SHELF",
            images: "[]",
            categoryId,
            sellerId: ownerId,
          },
        ],
      });

      const productList = await expectStatus(
        await productsRoute.GET(
          request(
            `http://localhost/api/products?keyword=测试商品&categoryId=${categoryId}&condition=GOOD&minPrice=1000&maxPrice=6000&sort=price_asc&page=1&pageSize=1`,
          ),
        ),
        200,
      );
      const productPage = productList.data as {
        items: Array<{ id: string; price: number }>;
        total: number;
        hasMore: boolean;
      };
      assert.equal(productPage.total, 2);
      assert.equal(productPage.hasMore, true);
      assert.equal(productPage.items[0]?.price, 3000);

      const productDetail = await expectStatus(
        await productDetailRoute.GET(
          request("http://localhost"),
          { params: Promise.resolve({ id: createdProduct.id }) },
        ),
        200,
      );
      assert.equal(
        (productDetail.data as { viewCount: number }).viewCount,
        1,
      );

      assert.equal(
        (
          await productDetailRoute.PUT(
            request(
              "http://localhost",
              "PUT",
              { title: "越权修改" },
              otherToken,
            ),
            { params: Promise.resolve({ id: createdProduct.id }) },
          )
        ).status,
        403,
      );
      await expectStatus(
        await productDetailRoute.PUT(
          request(
            "http://localhost",
            "PUT",
            { title: "测试商品 Alpha Updated" },
            ownerToken,
          ),
          { params: Promise.resolve({ id: createdProduct.id }) },
        ),
        200,
      );
      await expectStatus(
        await productDetailRoute.DELETE(
          request("http://localhost", "DELETE", undefined, ownerToken),
          { params: Promise.resolve({ id: createdProduct.id }) },
        ),
        200,
      );
      assert.equal(
        (
          await productDetailRoute.GET(
            request("http://localhost"),
            { params: Promise.resolve({ id: createdProduct.id }) },
          )
        ).status,
        404,
      );
      const productMine = await expectStatus(
        await productMineRoute.GET(
          request(
            "http://localhost/api/products/mine?status=OFF_SHELF",
            "GET",
            undefined,
            ownerToken,
          ),
        ),
        200,
      );
      assert.ok(
        (
          productMine.data as {
            items: Array<{ id: string }>;
          }
        ).items.some((item) => item.id === createdProduct.id),
      );

      await prisma.product.update({
        where: { id: `${productPrefix}second` },
        data: { status: "LOCKED" },
      });
      assert.equal(
        (
          await productDetailRoute.DELETE(
            request("http://localhost", "DELETE", undefined, ownerToken),
            {
              params: Promise.resolve({
                id: `${productPrefix}second`,
              }),
            },
          )
        ).status,
        409,
      );

      const rentalInput = {
        title: "测试租借 Alpha",
        description: "用于租借接口筛选测试",
        dailyPrice: 800,
        deposit: 10000,
        minDays: 2,
        maxDays: 10,
        images: ["/uploads/demo/rental-alpha.jpg"],
        categoryId,
      };
      assert.equal(
        (
          await rentalsRoute.POST(
            request(
              "http://localhost/api/rentals",
              "POST",
              rentalInput,
            ),
          )
        ).status,
        401,
      );
      const createdRentalBody = await expectStatus(
        await rentalsRoute.POST(
          request(
            "http://localhost/api/rentals",
            "POST",
            rentalInput,
            ownerToken,
          ),
        ),
        201,
      );
      const createdRental = createdRentalBody.data as {
        id: string;
        rentalStatus: string;
      };
      assert.equal(createdRental.rentalStatus, "AVAILABLE");

      await prisma.rentalItem.createMany({
        data: [
          {
            id: `${rentalPrefix}second`,
            title: "测试租借 Beta",
            description: "用于分页测试",
            dailyPrice: 500,
            deposit: 5000,
            minDays: 1,
            maxDays: 7,
            rentalStatus: "AVAILABLE",
            images: JSON.stringify(["https://example.com/rental-beta.jpg"]),
            categoryId,
            ownerId,
          },
          {
            id: `${rentalPrefix}hidden`,
            title: "测试租借 Hidden",
            description: "不应出现在公开列表",
            dailyPrice: 100,
            deposit: 1000,
            minDays: 1,
            rentalStatus: "OFF_SHELF",
            images: "[]",
            categoryId,
            ownerId,
          },
        ],
      });

      const rentalList = await expectStatus(
        await rentalsRoute.GET(
          request(
            `http://localhost/api/rentals?keyword=测试租借&categoryId=${categoryId}&minDailyPrice=100&maxDailyPrice=1000&sort=price_asc&page=1&pageSize=1`,
          ),
        ),
        200,
      );
      const rentalPage = rentalList.data as {
        items: Array<{ id: string; dailyPrice: number }>;
        total: number;
        hasMore: boolean;
      };
      assert.equal(rentalPage.total, 2);
      assert.equal(rentalPage.hasMore, true);
      assert.equal(rentalPage.items[0]?.dailyPrice, 500);

      const rentalDetail = await expectStatus(
        await rentalDetailRoute.GET(
          request("http://localhost"),
          { params: Promise.resolve({ id: createdRental.id }) },
        ),
        200,
      );
      assert.equal(
        (rentalDetail.data as { viewCount: number }).viewCount,
        1,
      );
      assert.equal(
        (
          await rentalDetailRoute.PUT(
            request(
              "http://localhost",
              "PUT",
              { title: "越权修改" },
              otherToken,
            ),
            { params: Promise.resolve({ id: createdRental.id }) },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await rentalDetailRoute.PUT(
            request(
              "http://localhost",
              "PUT",
              { maxDays: 1 },
              ownerToken,
            ),
            { params: Promise.resolve({ id: createdRental.id }) },
          )
        ).status,
        422,
      );
      await expectStatus(
        await rentalDetailRoute.PUT(
          request(
            "http://localhost",
            "PUT",
            { title: "测试租借 Alpha Updated", maxDays: 12 },
            ownerToken,
          ),
          { params: Promise.resolve({ id: createdRental.id }) },
        ),
        200,
      );
      await expectStatus(
        await rentalDetailRoute.DELETE(
          request("http://localhost", "DELETE", undefined, ownerToken),
          { params: Promise.resolve({ id: createdRental.id }) },
        ),
        200,
      );
      assert.equal(
        (
          await rentalDetailRoute.GET(
            request("http://localhost"),
            { params: Promise.resolve({ id: createdRental.id }) },
          )
        ).status,
        404,
      );
      const rentalMine = await expectStatus(
        await rentalMineRoute.GET(
          request(
            "http://localhost/api/rentals/mine?status=OFF_SHELF",
            "GET",
            undefined,
            ownerToken,
          ),
        ),
        200,
      );
      assert.ok(
        (
          rentalMine.data as {
            items: Array<{ id: string }>;
          }
        ).items.some((item) => item.id === createdRental.id),
      );

      await prisma.rentalItem.update({
        where: { id: `${rentalPrefix}second` },
        data: { rentalStatus: "RENTED" },
      });
      assert.equal(
        (
          await rentalDetailRoute.DELETE(
            request("http://localhost", "DELETE", undefined, ownerToken),
            {
              params: Promise.resolve({
                id: `${rentalPrefix}second`,
              }),
            },
          )
        ).status,
        409,
      );
    } finally {
      await cleanup();
      await prisma.$disconnect();
    }
  },
);
