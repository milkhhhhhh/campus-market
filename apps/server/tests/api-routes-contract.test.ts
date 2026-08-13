import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { API_ROUTES } from "@campus/shared";

const PARAM = "__ROUTE_PARAM__";

function walkRouteFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkRouteFiles(full, acc);
      continue;
    }
    if (entry === "route.ts") {
      acc.push(full);
    }
  }
  return acc;
}

/** `app/api/products/[id]/route.ts` → `/api/products/[id]` */
function fileToRoutePattern(file: string, apiRoot: string): string {
  const rel = path.relative(apiRoot, path.dirname(file)).replace(/\\/g, "/");
  return `/api/${rel}`;
}

function collectSharedPatterns(): Set<string> {
  const patterns = new Set<string>();

  const visit = (value: unknown) => {
    if (typeof value === "string" && value.startsWith("/api/")) {
      patterns.add(value);
      return;
    }
    if (typeof value === "function") {
      const sample = (value as (id: string) => string)(PARAM);
      patterns.add(sample.split(PARAM).join("[id]"));
      return;
    }
    if (value && typeof value === "object") {
      for (const child of Object.values(value as Record<string, unknown>)) {
        visit(child);
      }
    }
  };

  visit(API_ROUTES);
  return patterns;
}

test("shared API_ROUTES match implemented app/api routes", () => {
  const apiRoot = path.join(process.cwd(), "app", "api");
  const implemented = new Set(
    walkRouteFiles(apiRoot).map((file) => fileToRoutePattern(file, apiRoot)),
  );
  const shared = collectSharedPatterns();

  for (const pattern of shared) {
    assert.ok(
      implemented.has(pattern),
      `shared constant points to missing route: ${pattern}`,
    );
  }

  for (const pattern of implemented) {
    assert.ok(
      shared.has(pattern),
      `implemented route is not registered in @campus/shared: ${pattern}`,
    );
  }

  assert.equal(implemented.size, shared.size);
});
