import assert from "node:assert/strict";
import test from "node:test";

process.env.JWT_SECRET =
  "admin-session-test-secret-at-least-32-characters";

test("admin session sign and verify", async () => {
  const { signAdminSession, verifyAdminSession } = await import(
    "@/lib/admin-session"
  );

  const token = await signAdminSession("admin-user-1");
  assert.ok(token.length > 0);

  const payload = await verifyAdminSession(token);
  assert.ok(payload);
  assert.equal(payload!.sub, "admin-user-1");
  assert.equal(payload!.role, "ADMIN");
});

test("admin session rejects invalid token", async () => {
  const { verifyAdminSession } = await import("@/lib/admin-session");

  const payload = await verifyAdminSession("invalid.token.value");
  assert.equal(payload, null);
});

test("admin session rejects tampered token", async () => {
  const { signAdminSession, verifyAdminSession } = await import(
    "@/lib/admin-session"
  );

  const token = await signAdminSession("admin-user-2");
  const tampered = `${token.slice(0, -1)}x`;
  const payload = await verifyAdminSession(tampered);
  assert.equal(payload, null);
});
