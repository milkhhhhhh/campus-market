import type { ApiResult } from "@campus/shared";
import { NextResponse } from "next/server";

export function ok<T>(
  data: T,
  status = 200,
): NextResponse<ApiResult<T>> {
  const body: ApiResult<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
): NextResponse<ApiResult<never>> {
  const body: ApiResult<never> = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}
