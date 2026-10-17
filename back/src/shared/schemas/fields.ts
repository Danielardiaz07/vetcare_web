import { z } from "zod";
import { FieldLimit } from "@/config/constants";

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(FieldLimit.EMAIL_MAX, "El correo es demasiado largo")
  .pipe(z.email("Correo con formato invalido"));

export const passwordField = z
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

export const requiredNameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio`)
    .max(FieldLimit.NAME_MAX, `${label} admite maximo ${FieldLimit.NAME_MAX} caracteres`);

export const documentNumberField = z
  .string()
  .trim()
  .regex(
    new RegExp(`^\\d{${FieldLimit.DOCUMENT_NUMBER_MIN},${FieldLimit.DOCUMENT_NUMBER_MAX}}$`),
    `La cedula debe tener entre ${FieldLimit.DOCUMENT_NUMBER_MIN} y ${FieldLimit.DOCUMENT_NUMBER_MAX} digitos`,
  );

export const phoneField = z
  .string()
  .trim()
  .regex(
    new RegExp(`^\\d{${FieldLimit.PHONE_DIGITS}}$`),
    `El telefono debe tener ${FieldLimit.PHONE_DIGITS} digitos`,
  );

export const addressField = z
  .string()
  .trim()
  .max(FieldLimit.ADDRESS_MAX, `La direccion admite maximo ${FieldLimit.ADDRESS_MAX} caracteres`);

export const uuidParamSchema = z.object({ id: z.uuid("Identificador invalido") });
