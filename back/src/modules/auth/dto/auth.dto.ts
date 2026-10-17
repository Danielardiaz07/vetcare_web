import { DocumentType } from "@prisma/client";
import { z } from "zod";
import { FieldLimit, OTP_LENGTH } from "@/config/constants";
import {
  addressField,
  documentNumberField,
  emailField as email,
  phoneField,
  requiredNameField as requiredName,
} from "@/shared/schemas/fields";

const password = z
  .string()
  .min(
    FieldLimit.PASSWORD_MIN,
    `La contrasena debe tener minimo ${FieldLimit.PASSWORD_MIN} caracteres`,
  )
  .max(
    FieldLimit.PASSWORD_MAX,
    `La contrasena debe tener maximo ${FieldLimit.PASSWORD_MAX} caracteres`,
  )
  .regex(/[A-Z]/, "La contrasena debe tener al menos una mayuscula")
  .regex(/\d/, "La contrasena debe tener al menos un numero");

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

export type RegisterRequestDto = z.infer<typeof registerRequestSchema>;
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
