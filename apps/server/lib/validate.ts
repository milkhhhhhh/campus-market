import { z } from "zod";

export interface ValidationIssue {
  code: string;
  message: string;
  path: Array<string | number>;
}

export class ValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super("请求参数校验失败");
    this.name = "ValidationError";
  }

  toDetails(): Record<string, unknown> {
    return { issues: this.issues };
  }
}

export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path.map((part) =>
          typeof part === "symbol" ? part.description ?? "symbol" : part,
        ),
      })),
    );
  }
  return result.data;
}

export async function validateJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError([
      {
        code: "invalid_json",
        message: "请求体不是合法 JSON",
        path: [],
      },
    ]);
  }
  return validate(schema, body);
}

export function validateQuery<T>(
  request: Request,
  schema: z.ZodType<T>,
): T {
  const values: Record<string, string | string[]> = {};
  const searchParams = new URL(request.url).searchParams;

  for (const key of new Set(searchParams.keys())) {
    const all = searchParams.getAll(key);
    values[key] = all.length > 1 ? all : (all[0] ?? "");
  }

  return validate(schema, values);
}
