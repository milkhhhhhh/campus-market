import type { User } from "@campus/db";
import {
  UserRole,
  VerifyStatus,
  type UserDTO,
} from "@campus/shared";

export function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    role: user.role as UserRole,
    verifyStatus: user.verifyStatus as VerifyStatus,
    school: user.school,
    studentId: user.studentId,
    createdAt: user.createdAt.toISOString(),
  };
}
