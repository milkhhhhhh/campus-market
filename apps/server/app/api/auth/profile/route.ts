import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { handleRouteError } from "@/lib/route-error";
import { updateProfileSchema } from "@/lib/schemas/auth";
import { toUserDTO } from "@/lib/user-dto";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    return ok(toUserDTO(user));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getUserFromRequest(request);
    const input = await validateJson(request, updateProfileSchema);
    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: input,
    });
    return ok(toUserDTO(user));
  } catch (error) {
    return handleRouteError(error);
  }
}
