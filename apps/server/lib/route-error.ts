import type { NextResponse } from "next/server";

import { AuthError } from "@/lib/auth";
import { fail } from "@/lib/response";
import { ValidationError } from "@/lib/validate";

export class RouteError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "RouteError";
  }
}

export function isPrismaError(
  error: unknown,
  code: string,
): error is Error & { code: string } {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: unknown }).code === code
  );
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return fail(error.code, error.message, error.status);
  }
  if (error instanceof ValidationError) {
    return fail(
      "VALIDATION_ERROR",
      error.message,
      422,
      error.toDetails(),
    );
  }
  if (error instanceof RouteError) {
    return fail(error.code, error.message, error.status);
  }
  if (isPrismaError(error, "P2002")) {
    return fail("RESOURCE_CONFLICT", "提交的数据已被占用", 409);
  }
  if (isPrismaError(error, "P2025")) {
    return fail("NOT_FOUND", "资源不存在", 404);
  }
  if (isPrismaError(error, "P2003")) {
    return fail("INVALID_REFERENCE", "关联的资源不存在", 422);
  }

  console.error("Unhandled route error");
  return fail("INTERNAL_ERROR", "服务器内部错误", 500);
}
