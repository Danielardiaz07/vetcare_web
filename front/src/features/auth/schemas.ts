import { z } from "zod";
import { FIELD_LIMITS, OTP_LENGTH } from "@/lib/constants";
import type { DocumentType } from "@/types/domain";

export const REGISTER_DOCUMENT_TYPES = [
  "CC",
  "CE",
  "TI",
  "PA",
] as const satisfies readonly DocumentType[];

const {
  EMAIL_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX,
  DOCUMENT_NUMBER_MIN,
  DOCUMENT_NUMBER_MAX,
  NAME_MAX,
  PHONE_DIGITS,
  ADDRESS_MAX,
} = FIELD_LIMITS;

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "El correo es obligatorio")
  .max(EMAIL_MAX, "El correo es demasiado largo")
  .pipe(z.email("Escribe un correo válido"));

// RN-02
export const passwordField = z
  .string()
  .min(PASSWORD_MIN, `La contraseña debe tener mínimo ${PASSWORD_MIN} caracteres`)
  .max(PASSWORD_MAX, `La contraseña debe tener máximo ${PASSWORD_MAX} caracteres`)
  .regex(/[A-Z]/, "La contraseña debe tener al menos una mayúscula")
  .regex(/\d/, "La contraseña debe tener al menos un número");

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} son obligatorios`)
    .max(NAME_MAX, `${label} admiten máximo ${NAME_MAX} caracteres`);

export const loginSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .max(PASSWORD_MAX, `La contraseña debe tener máximo ${PASSWORD_MAX} caracteres`),
});

// RN-01, RN-02 y RN-60
export const registerSchema = z
  .object({
    documentType: z.enum(REGISTER_DOCUMENT_TYPES, "Selecciona el tipo de documento"),
    documentNumber: z
      .string()
      .trim()
      .regex(
        new RegExp(`^\\d{${DOCUMENT_NUMBER_MIN},${DOCUMENT_NUMBER_MAX}}$`),
        `El documento debe tener entre ${DOCUMENT_NUMBER_MIN} y ${DOCUMENT_NUMBER_MAX} dígitos`,
      ),
    firstNames: nameField("Los nombres"),
    lastNames: nameField("Los apellidos"),
    email: emailField,
    phone: z
      .string()
      .trim()
      .regex(
        new RegExp(`^3\\d{${PHONE_DIGITS - 1}}$`),
        `El celular debe tener ${PHONE_DIGITS} dígitos y empezar por 3`,
      ),
    address: z
      .string()
      .trim()
      .max(ADDRESS_MAX, `La dirección admite máximo ${ADDRESS_MAX} caracteres`)
      .optional(),
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
    acceptDataPolicy: z
      .boolean()
      .refine((accepted) => accepted, "Debes aceptar el tratamiento de tus datos personales"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export const otpSchema = z.object({
  code: z
    .string()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `El código tiene ${OTP_LENGTH} dígitos`),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
