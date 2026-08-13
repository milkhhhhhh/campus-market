import { serializeImages } from "@campus/db";
import { VerifyStatus } from "@campus/shared";

import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import {
  handleRouteError,
  isPrismaError,
  RouteError,
} from "@/lib/route-error";
import { verifySubmitSchema } from "@/lib/schemas/auth";
import { toUserDTO } from "@/lib/user-dto";
import { validateJson } from "@/lib/validate";

export const runtime = "nodejs";

function verificationStateError(status: string): RouteError {
  if (status === VerifyStatus.PENDING) {
    return new RouteError(
      "VERIFY_ALREADY_PENDING",
      "校园认证正在审核中",
      409,
    );
  }
  if (status === VerifyStatus.APPROVED) {
    return new RouteError(
      "VERIFY_ALREADY_APPROVED",
      "校园认证已通过",
      409,
    );
  }
  return new RouteError(
    "VERIFY_STATE_CHANGED",
    "认证状态已发生变化，请刷新后重试",
    409,
  );
}

export async function POST(request: Request) {
  try {
    const currentUser = await getUserFromRequest(request);
    const input = await validateJson(request, verifySubmitSchema);

    if (
      currentUser.verifyStatus === VerifyStatus.PENDING ||
      currentUser.verifyStatus === VerifyStatus.APPROVED
    ) {
      throw verificationStateError(currentUser.verifyStatus);
    }

    const existingStudent = await prisma.user.findFirst({
      where: {
        school: input.school,
        studentId: input.studentId,
        NOT: { id: currentUser.id },
      },
      select: { id: true },
    });
    if (existingStudent) {
      throw new RouteError(
        "STUDENT_ID_IN_USE",
        "该学校与学号已被其他账号使用",
        409,
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: currentUser.id,
          verifyStatus: {
            in: [VerifyStatus.UNVERIFIED, VerifyStatus.REJECTED],
          },
        },
        data: {
          school: input.school,
          studentId: input.studentId,
          verifyProof: serializeImages(input.proofImages),
          verifyStatus: VerifyStatus.PENDING,
        },
      });
      const user = await tx.user.findUniqueOrThrow({
        where: { id: currentUser.id },
      });
      return { didUpdate: updated.count === 1, user };
    });

    if (!result.didUpdate) {
      throw verificationStateError(result.user.verifyStatus);
    }
    return ok(toUserDTO(result.user));
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return handleRouteError(
        new RouteError(
          "STUDENT_ID_IN_USE",
          "该学校与学号已被其他账号使用",
          409,
        ),
      );
    }
    return handleRouteError(error);
  }
}
