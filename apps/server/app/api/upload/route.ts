import { getUserFromRequest } from "@/lib/auth";
import { ok } from "@/lib/response";
import { handleRouteError, RouteError } from "@/lib/route-error";
import {
  createStorageProvider,
  getUploadConfig,
} from "@/lib/upload";
import {
  parseUploadFormFiles,
  validateUploadFiles,
} from "@/lib/upload/validate";
import { UploadValidationError } from "@/lib/upload/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    const config = getUploadConfig(request);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new RouteError(
        "INVALID_MULTIPART",
        "请求体不是合法的 multipart/form-data",
        422,
      );
    }

    const files = await parseUploadFormFiles(formData);
    const validated = await validateUploadFiles(files, config);
    const stored = await createStorageProvider(config).upload(
      user.id,
      validated,
    );

    return ok({ urls: stored.map((item) => item.url) }, 201);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return handleRouteError(
        new RouteError(error.code, error.message, 422),
      );
    }
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return handleRouteError(
        new RouteError("UPLOAD_FAILED", "文件写入失败", 500),
      );
    }
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === "EACCES"
    ) {
      return handleRouteError(
        new RouteError("UPLOAD_FAILED", "文件写入失败", 500),
      );
    }
    if (error instanceof Error && error.message.includes("ENOSPC")) {
      return handleRouteError(
        new RouteError("UPLOAD_FAILED", "文件写入失败", 500),
      );
    }
    return handleRouteError(error);
  }
}
