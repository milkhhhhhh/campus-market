import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import test from "node:test";

process.env.DATABASE_URL = "file:./dev.db";
process.env.JWT_SECRET =
  "admin-auth-test-secret-at-least-32-characters";

test("authenticateAdmin success and failure", { timeout: 30_000 }, async () => {
  const { prisma } = await import("@/lib/prisma");
  const { authenticateAdmin } = await import("@/lib/admin-auth-server");

  const adminId = "test-admin-auth-user";
  const password = "test-admin-pass";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.deleteMany({ where: { id: adminId } });
  await prisma.user.create({
    data: {
      id: adminId,
      openId: "test-admin-auth-openid",
      nickname: "测试管理员",
      role: "ADMIN",
      adminUsername: "testadmin",
      passwordHash,
      banned: false,
    },
  });

  try {
    const user = await authenticateAdmin("testadmin", password);
    assert.ok(user);
    assert.equal(user!.id, adminId);

    const wrongPassword = await authenticateAdmin("testadmin", "wrong");
    assert.equal(wrongPassword, null);

    await prisma.user.update({
      where: { id: adminId },
      data: { banned: true },
    });
    const banned = await authenticateAdmin("testadmin", password);
    assert.equal(banned, null);
  } finally {
    await prisma.user.deleteMany({ where: { id: adminId } });
  }
});
