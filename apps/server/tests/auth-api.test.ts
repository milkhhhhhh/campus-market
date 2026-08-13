import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL = "file:./dev.db";
process.env.JWT_SECRET = "auth-api-test-secret-at-least-32-characters";

interface ApiEnvelope {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code?: string; details?: Record<string, unknown> };
}

function jsonRequest(
  url: string,
  body: Record<string, unknown>,
  token?: string,
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function bodyOf(response: Response): Promise<ApiEnvelope> {
  return (await response.json()) as ApiEnvelope;
}

test(
  "authentication API contract",
  { timeout: 30_000 },
  async () => {
    const [
      { prisma },
      registerRoute,
      loginRoute,
      profileRoute,
      verifyRoute,
    ] = await Promise.all([
      import("@/lib/prisma"),
      import("@/app/api/auth/register/route"),
      import("@/app/api/auth/login/route"),
      import("@/app/api/auth/profile/route"),
      import("@/app/api/auth/verify/route"),
    ]);

    const username = "auth_api_contract_user";
    const password = "TestPass1";
    const testOpenId = `local_${username}`;
    const blockerOpenId = "auth-api-test-blocker";

    await prisma.user.deleteMany({
      where: {
        OR: [
          { openId: { in: [testOpenId, blockerOpenId] } },
          { username },
        ],
      },
    });

    try {
      const invalidRegister = await registerRoute.POST(
        jsonRequest("http://localhost/api/auth/register", {
          username: "ab",
          password: "short",
        }),
      );
      assert.equal(invalidRegister.status, 422);

      const registered = await registerRoute.POST(
        jsonRequest("http://localhost/api/auth/register", {
          username,
          password,
          nickname: "认证接口测试用户",
        }),
      );
      const registerBody = await bodyOf(registered);
      assert.equal(registered.status, 201);
      assert.equal(registerBody.success, true);
      assert.equal(registerBody.data?.tokenType, "Bearer");
      const token = registerBody.data?.token;
      assert.equal(typeof token, "string");

      const serializedRegister = JSON.stringify(registerBody);
      for (const sensitive of [
        "openId",
        "unionId",
        "sessionKey",
        "verifyProof",
        "passwordHash",
      ]) {
        assert.equal(serializedRegister.includes(sensitive), false);
      }

      const duplicateRegister = await registerRoute.POST(
        jsonRequest("http://localhost/api/auth/register", {
          username,
          password,
        }),
      );
      assert.equal(duplicateRegister.status, 409);

      assert.equal(
        await prisma.user.count({ where: { openId: testOpenId } }),
        1,
      );

      const badLogin = await loginRoute.POST(
        jsonRequest("http://localhost/api/auth/login", {
          username,
          password: "WrongPass1",
        }),
      );
      assert.equal(badLogin.status, 401);

      const login = await loginRoute.POST(
        jsonRequest("http://localhost/api/auth/login", {
          username,
          password,
        }),
      );
      const loginBody = await bodyOf(login);
      assert.equal(login.status, 200);
      assert.equal(typeof loginBody.data?.token, "string");

      const unauthorizedProfile = await profileRoute.GET(
        new Request("http://localhost/api/auth/profile"),
      );
      assert.equal(unauthorizedProfile.status, 401);

      const profileRequest = new Request(
        "http://localhost/api/auth/profile",
        { headers: { authorization: `Bearer ${token as string}` } },
      );
      const profile = await profileRoute.GET(profileRequest);
      assert.equal(profile.status, 200);
      assert.equal((await bodyOf(profile)).success, true);

      const invalidUpdate = await profileRoute.PUT(
        jsonRequest(
          "http://localhost/api/auth/profile",
          { role: "ADMIN" },
          token as string,
        ),
      );
      assert.equal(invalidUpdate.status, 422);

      const updatedProfile = await profileRoute.PUT(
        jsonRequest(
          "http://localhost/api/auth/profile",
          { nickname: "认证接口测试用户改", avatar: null },
          token as string,
        ),
      );
      assert.equal(updatedProfile.status, 200);
      assert.equal(
        (await bodyOf(updatedProfile)).data?.nickname,
        "认证接口测试用户改",
      );

      const verificationBody = {
        school: "接口测试大学",
        studentId: "AUTH_TEST_001",
        proofImages: ["https://example.com/proof.jpg"],
      };
      const unauthorizedVerify = await verifyRoute.POST(
        jsonRequest(
          "http://localhost/api/auth/verify",
          verificationBody,
        ),
      );
      assert.equal(unauthorizedVerify.status, 401);

      const verified = await verifyRoute.POST(
        jsonRequest(
          "http://localhost/api/auth/verify",
          verificationBody,
          token as string,
        ),
      );
      assert.equal(verified.status, 200);
      assert.equal((await bodyOf(verified)).data?.verifyStatus, "PENDING");

      const repeated = await verifyRoute.POST(
        jsonRequest(
          "http://localhost/api/auth/verify",
          verificationBody,
          token as string,
        ),
      );
      assert.equal(repeated.status, 409);
      assert.equal(
        (await bodyOf(repeated)).error?.code,
        "VERIFY_ALREADY_PENDING",
      );

      const testUser = await prisma.user.findUniqueOrThrow({
        where: { openId: testOpenId },
      });
      await prisma.user.update({
        where: { id: testUser.id },
        data: { verifyStatus: "REJECTED" },
      });
      await prisma.user.create({
        data: {
          openId: blockerOpenId,
          nickname: "学号占用测试用户",
          school: "冲突测试大学",
          studentId: "AUTH_DUP_001",
        },
      });

      const duplicateStudentId = await verifyRoute.POST(
        jsonRequest(
          "http://localhost/api/auth/verify",
          {
            ...verificationBody,
            school: "冲突测试大学",
            studentId: "AUTH_DUP_001",
          },
          token as string,
        ),
      );
      assert.equal(duplicateStudentId.status, 409);
      assert.equal(
        (await bodyOf(duplicateStudentId)).error?.code,
        "STUDENT_ID_IN_USE",
      );

      const resubmitted = await verifyRoute.POST(
        jsonRequest(
          "http://localhost/api/auth/verify",
          {
            ...verificationBody,
            studentId: "AUTH_TEST_002",
          },
          token as string,
        ),
      );
      assert.equal(resubmitted.status, 200);

      await prisma.user.update({
        where: { id: testUser.id },
        data: { verifyStatus: "APPROVED" },
      });
      const approvedRepeat = await verifyRoute.POST(
        jsonRequest(
          "http://localhost/api/auth/verify",
          verificationBody,
          token as string,
        ),
      );
      assert.equal(approvedRepeat.status, 409);
      assert.equal(
        (await bodyOf(approvedRepeat)).error?.code,
        "VERIFY_ALREADY_APPROVED",
      );
    } finally {
      await prisma.user.deleteMany({
        where: {
          OR: [
            { openId: { in: [testOpenId, blockerOpenId] } },
            { username },
          ],
        },
      });
      await prisma.$disconnect();
    }
  },
);
