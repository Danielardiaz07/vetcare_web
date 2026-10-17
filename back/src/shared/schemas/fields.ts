import { z } from "zod";
import { FieldLimit } from "@/config/constants";

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(FieldLimit.EMAIL_MAX, "El correo es demasiado largo")
  .pipe(z.email("Correo con formato invalido"));

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
