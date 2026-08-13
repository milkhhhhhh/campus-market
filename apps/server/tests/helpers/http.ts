import assert from "node:assert/strict";

export interface ApiEnvelope {
  success: boolean;
  data?: Record<string, unknown>;
  error?: { code?: string; details?: Record<string, unknown>; message?: string };
}

export function jsonRequest(
  url: string,
  body: Record<string, unknown>,
  token?: string,
  method = "POST",
): Request {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

export function request(
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

export async function bodyOf(response: Response): Promise<ApiEnvelope> {
  return (await response.json()) as ApiEnvelope;
}

export async function expectStatus(
  response: Response,
  status: number,
): Promise<ApiEnvelope> {
  const body = await bodyOf(response);
  assert.equal(response.status, status, JSON.stringify(body));
  return body;
}
