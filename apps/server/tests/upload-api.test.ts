import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

process.env.DATABASE_URL = "file:./dev.db";
process.env.JWT_SECRET =
  "upload-test-secret-at-least-32-characters-long";
process.env.UPLOAD_BASE_URL = "http://localhost:3000/uploads";
process.env.UPLOAD_STORAGE = "local";
process.env.UPLOAD_MAX_FILE_SIZE = "5242880";
process.env.UPLOAD_MAX_FILES = "9";

interface ApiEnvelope {
  success: boolean;
  data?: { urls?: string[] };
  error?: { code?: string };
}

function minimalPngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

function minimalJpegBuffer(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);
}

function uploadRequest(
  files: Array<{ name: string; type: string; buffer: Buffer }>,
  token?: string,
  fieldName: "files" | "file" = "files",
): Request {
  const formData = new FormData();
  for (const file of files) {
    formData.append(
      fieldName,
      new File([new Uint8Array(file.buffer)], file.name, { type: file.type }),
    );
  }
  return new Request("http://localhost:3000/api/upload", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: formData,
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

test("upload API contract", { timeout: 30_000 }, async () => {
  const [{ prisma }, { signAccessToken }, uploadRoute] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/auth"),
    import("@/app/api/upload/route"),
  ]);

  const userId = "test-upload-user";
  const uploadRoot = path.join(process.cwd(), "public", "uploads", userId);

  const cleanup = async () => {
    await rm(uploadRoot, { recursive: true, force: true });
    await prisma.user.deleteMany({ where: { id: userId } });
  };

  await cleanup();
  const user = await prisma.user.create({
    data: {
      id: userId,
      openId: "test-upload-openid",
      nickname: "上传测试用户",
    },
  });
  const token = signAccessToken(user);

  try {
    const unauthorized = await expectStatus(
      await uploadRoute.POST(
        uploadRequest([
          {
            name: "a.png",
            type: "image/png",
            buffer: minimalPngBuffer(),
          },
        ]),
      ),
      401,
    );
    assert.equal(unauthorized.error?.code, "AUTH_REQUIRED");

    const uploaded = await expectStatus(
      await uploadRoute.POST(
        uploadRequest(
          [
            {
              name: "a.png",
              type: "image/png",
              buffer: minimalPngBuffer(),
            },
            {
              name: "b.jpg",
              type: "image/jpeg",
              buffer: minimalJpegBuffer(),
            },
          ],
          token,
        ),
      ),
      201,
    );
    assert.equal(uploaded.data!.urls!.length, 2);
    for (const url of uploaded.data!.urls!) {
      assert.ok(url.startsWith("http://localhost:3000/uploads/"));
      assert.ok(url.includes(`${userId}/`));
    }

    const singularField = await expectStatus(
      await uploadRoute.POST(
        uploadRequest(
          [
            {
              name: "c.png",
              type: "image/png",
              buffer: minimalPngBuffer(),
            },
          ],
          token,
          "file",
        ),
      ),
      201,
    );
    assert.equal(singularField.data!.urls!.length, 1);
    assert.ok(
      singularField.data!.urls![0]!.startsWith("http://localhost:3000/uploads/"),
    );

    const invalidType = await expectStatus(
      await uploadRoute.POST(
        uploadRequest(
          [
            {
              name: "bad.txt",
              type: "text/plain",
              buffer: Buffer.from("hello"),
            },
          ],
          token,
        ),
      ),
      422,
    );
    assert.equal(invalidType.error?.code, "UPLOAD_INVALID_FILE_TYPE");

    const emptyFiles = await expectStatus(
      await uploadRoute.POST(
        new Request("http://localhost/api/upload", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: new FormData(),
        }),
      ),
      422,
    );
    assert.equal(emptyFiles.error?.code, "UPLOAD_FILES_REQUIRED");

    const tooLarge = await expectStatus(
      await uploadRoute.POST(
        uploadRequest(
          [
            {
              name: "big.png",
              type: "image/png",
              buffer: Buffer.concat([
                minimalPngBuffer(),
                Buffer.alloc(6 * 1024 * 1024),
              ]),
            },
          ],
          token,
        ),
      ),
      422,
    );
    assert.equal(tooLarge.error?.code, "UPLOAD_FILE_TOO_LARGE");

    const fakeMime = await expectStatus(
      await uploadRoute.POST(
        uploadRequest(
          [
            {
              name: "fake.jpg",
              type: "image/jpeg",
              buffer: minimalPngBuffer(),
            },
          ],
          token,
        ),
      ),
      422,
    );
    assert.equal(fakeMime.error?.code, "UPLOAD_INVALID_FILE_CONTENT");
  } finally {
    await cleanup();
  }
});
