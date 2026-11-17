import { DocumentType } from "@prisma/client";
import { z } from "zod";
import { FieldLimit, OTP_LENGTH, PASSWORD_RESET_TOKEN_MAX } from "@/config/constants";
import {
  addressField,
  documentNumberField,
  emailField as email,
  passwordField as password,
  phoneField,
  requiredNameField as requiredName,
} from "@/shared/schemas/fields";

export const registerRequestSchema = z
  .object({
    documentType: z.enum(DocumentType).default(DocumentType.CC),
    documentNumber: documentNumberField,
    firstNames: requiredName("Los nombres"),
    lastNames: requiredName("Los apellidos"),
    email,
    phone: phoneField,
    address: addressField.optional(),
    password,
    confirmPassword: z.string(),
    acceptDataPolicy: z.literal(true, "Debes aceptar el tratamiento de datos personales"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contrasenas no coinciden",
  });

export const otpVerifyRequestSchema = z.object({
  email,
  code: z
    .string()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `El codigo tiene ${OTP_LENGTH} digitos`),
});

export const otpResendRequestSchema = z.object({ email });

export const loginRequestSchema = z.object({
  email,
  password: z.string().min(1, "La contrasena es obligatoria").max(FieldLimit.PASSWORD_MAX),
});

// RN-11, D-18: la cuenta se identifica por correo o por cédula, nunca por ambos.
export const forgotPasswordRequestSchema = z
  .object({ email: email.optional(), documentNumber: documentNumberField.optional() })
  .refine((data) => Boolean(data.email) !== Boolean(data.documentNumber), {
    message: "Indica tu correo o tu cedula",
  });

export const resetPasswordRequestSchema = z
  .object({
    token: z.string().min(1, "El enlace es invalido").max(PASSWORD_RESET_TOKEN_MAX),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contrasenas no coinciden",
  });

export type RegisterRequestDto = z.infer<typeof registerRequestSchema>;
export type ForgotPasswordRequestDto = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequestDto = z.infer<typeof resetPasswordRequestSchema>;
export type OtpVerifyRequestDto = z.infer<typeof otpVerifyRequestSchema>;
export type OtpResendRequestDto = z.infer<typeof otpResendRequestSchema>;
export type LoginRequestDto = z.infer<typeof loginRequestSchema>;

export interface UserResponseDto {
  id: string;
  email: string;
  role: string;
  ownerId: string | null;
}

export interface AuthSessionResponseDto {
  accessToken: string;
  user: UserResponseDto;
}

export interface RegisterResponseDto {
  email: string;
  message: string;
}

export interface MessageResponseDto {
  message: string;
}
