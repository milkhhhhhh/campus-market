import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import test from "node:test";

import { bodyOf, expectStatus, jsonRequest } from "./helpers/http";

process.env.DATABASE_URL = "file:./dev.db";
process.env.JWT_SECRET =
  "misc-api-test-secret-at-least-32-characters";

test("health / devices / dev-login / admin login API", { timeout: 60_000 }, async () => {
  const [
    { prisma },
    { signAccessToken },
    healthRoute,
    devicesRoute,
    devLoginRoute,
    adminLoginRoute,
  ] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/auth"),
    import("@/app/api/health/route"),
    import("@/app/api/devices/register/route"),
    import("@/app/api/auth/dev-login/route"),
    import("@/app/api/admin/auth/login/route"),
  ]);

  const userId = "test-misc-user";
  const adminId = "test-misc-admin";
  const password = "MiscAdminPass1";
  const passwordHash = await bcrypt.hash(password, 10);
  const deviceToken = "misc-device-token-abcdefgh";

  const cleanup = async () => {
    await prisma.deviceToken.deleteMany({
      where: { OR: [{ userId }, { token: deviceToken }] },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: { in: [userId, adminId] } },
          { openId: "local_misc_dev_user" },
          { adminUsername: "miscadmin" },
        ],
      },
    });
  };

  await cleanup();

  const user = await prisma.user.create({
    data: {
      id: userId,
      openId: "test-misc-openid",
      nickname: "杂项接口用户",
    },
  });
  const token = signAccessToken(user);

  await prisma.user.create({
    data: {
      id: adminId,
      openId: "test-misc-admin-openid",
      nickname: "杂项管理员",
      role: "ADMIN",
      adminUsername: "miscadmin",
      passwordHash,
      banned: false,
    },
  });

  try {
    const health = await expectStatus(await healthRoute.GET(), 200);
    assert.equal(health.data?.status, "ok");
    assert.equal(health.data?.database, "connected");
    assert.equal(typeof health.data?.timestamp, "string");

    const unauthorizedDevice = await expectStatus(
      await devicesRoute.POST(
        jsonRequest("http://localhost/api/devices/register", {
          token: deviceToken,
          platform: "web",
        }),
      ),
      401,
    );
    assert.equal(unauthorizedDevice.error?.code, "AUTH_REQUIRED");

    const invalidDevice = await expectStatus(
      await devicesRoute.POST(
        jsonRequest(
          "http://localhost/api/devices/register",
          { token: "short", platform: "web" },
          token,
        ),
      ),
      422,
    );
    assert.ok(invalidDevice.error);

    const registered = await expectStatus(
      await devicesRoute.POST(
        jsonRequest(
          "http://localhost/api/devices/register",
          { token: deviceToken, platform: "android" },
          token,
        ),
      ),
      200,
    );
    assert.equal(registered.data?.platform, "android");
    const deviceId = registered.data?.id as string;
    assert.ok(deviceId);

    const updated = await expectStatus(
      await devicesRoute.POST(
        jsonRequest(
          "http://localhost/api/devices/register",
          { token: deviceToken, platform: "ios" },
          token,
        ),
      ),
      200,
    );
    assert.equal(updated.data?.id, deviceId);
    assert.equal(updated.data?.platform, "ios");

    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const forbidden = await expectStatus(
        await devLoginRoute.POST(
          jsonRequest("http://localhost/api/auth/dev-login", {
            username: "misc_dev_user",
          }),
        ),
        403,
      );
      assert.equal(forbidden.error?.code, "DEV_LOGIN_FORBIDDEN");
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }

    const devLogin = await expectStatus(
      await devLoginRoute.POST(
        jsonRequest("http://localhost/api/auth/dev-login", {
          username: "misc_dev_user",
        }),
      ),
      200,
    );
    assert.equal(typeof devLogin.data?.token, "string");
    assert.equal(devLogin.data?.tokenType, "Bearer");

    const badAdmin = await expectStatus(
      await adminLoginRoute.POST(
        jsonRequest("http://localhost/api/admin/auth/login", {
          username: "miscadmin",
          password: "wrong-password",
        }),
      ),
      401,
    );
    assert.equal(badAdmin.error?.code, "AUTH_INVALID");

    const adminJson = await adminLoginRoute.POST(
      jsonRequest("http://localhost/api/admin/auth/login", {
        username: "miscadmin",
        password,
        next: "/admin",
      }),
    );
    const adminJsonBody = await bodyOf(adminJson);
    assert.equal(adminJson.status, 200, JSON.stringify(adminJsonBody));
    assert.equal(adminJsonBody.data?.redirectTo, "/admin");
    const jsonCookie = adminJson.headers.get("set-cookie") ?? "";
    assert.ok(
      jsonCookie.includes("campus_admin_session="),
      `missing session cookie: ${jsonCookie}`,
    );

    const formBody = new URLSearchParams({
      username: "miscadmin",
      password,
      next: "/admin/reports",
    });
    const adminForm = await adminLoginRoute.POST(
      new Request("http://localhost/api/admin/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      }),
    );
    assert.equal(adminForm.status, 303);
    assert.equal(adminForm.headers.get("location"), "/admin/reports");
    const formCookie = adminForm.headers.get("set-cookie") ?? "";
    assert.ok(formCookie.includes("campus_admin_session="));
  } finally {
    await cleanup();
  }
});
