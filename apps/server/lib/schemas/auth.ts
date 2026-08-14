import type {
  DevLoginInput,
  PasswordLoginInput,
  RegisterInput,
  UpdateProfileInput,
  VerifySubmitInput,
} from "@campus/shared";
import { z } from "zod";

import { imageRefSchema } from "@/lib/schemas/image-ref";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[A-Za-z0-9._@+-]+$/, "用户名格式不正确");

/** 登录放宽，兼容历史短密码 */
const loginPasswordSchema = z.string().min(6).max(72);

/** 新注册：至少 8 位且含字母与数字 */
const registerPasswordSchema = z
  .string()
  .min(8, "密码至少 8 位")
  .max(72)
  .regex(/[A-Za-z]/, "密码需包含字母")
  .regex(/[0-9]/, "密码需包含数字");

export const registerSchema: z.ZodType<RegisterInput> = z.strictObject({
  username: usernameSchema,
  password: registerPasswordSchema,
  nickname: z.string().trim().min(1).max(32).optional(),
});

export const passwordLoginSchema: z.ZodType<PasswordLoginInput> =
  z.strictObject({
    username: usernameSchema,
    password: loginPasswordSchema,
  });

export const devLoginSchema: z.ZodType<DevLoginInput> = z.strictObject({
  username: usernameSchema.optional(),
});

export const updateProfileSchema: z.ZodType<UpdateProfileInput> =
  z
    .strictObject({
      nickname: z.string().trim().min(1).max(32).optional(),
      avatar: imageRefSchema.nullable().optional(),
    })
    .refine(
      (value) =>
        value.nickname !== undefined || value.avatar !== undefined,
      { message: "至少提供一个可修改字段" },
    );

export const verifySubmitSchema: z.ZodType<VerifySubmitInput> =
  z.strictObject({
    school: z.string().trim().min(1).max(100),
    studentId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{4,32}$/, "学号格式不正确"),
    proofImages: z.array(imageRefSchema).min(1).max(3),
  });
