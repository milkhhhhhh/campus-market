import type { User } from "@campus/db";
import { UserRole } from "@campus/shared";

import { RouteError } from "@/lib/route-error";

export function requireAdmin(user: User): void {
  if (user.role !== UserRole.ADMIN) {
    throw new RouteError("FORBIDDEN", "需要管理员权限", 403);
  }
}
