import { z } from "zod";
import { passwordField, registerFieldsSchema } from "@/features/auth/schemas";

// Los mismos campos y reglas del registro, sin la contraseña ni la aceptación (las da el propietario).
export const ownerSchema = registerFieldsSchema.omit({
  password: true,
  confirmPassword: true,
  acceptDataPolicy: true,
});

export type OwnerFormInput = z.infer<typeof ownerSchema>;

// RN-17: al editar no se muestran el tipo ni el número de documento; el tipo puede ser uno que el registro no ofrece.
export const ownerEditSchema = ownerSchema.extend({
  documentType: z.custom<OwnerFormInput["documentType"]>(),
});

// D-32: el propietario solo cambia su celular y su dirección; correo y cédula no (D-18).
export const myContactSchema = registerFieldsSchema.pick({ phone: true, address: true });

export type MyContactInput = z.infer<typeof myContactSchema>;

// RN-02; la API también exige que la nueva sea distinta de la actual (D-32).
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual"),
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirma la contraseña nueva"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  })
  .refine((data) => data.password !== data.currentPassword, {
    path: ["password"],
    message: "La contraseña nueva debe ser distinta de la actual",
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
