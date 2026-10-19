import { z } from "zod";
import { registerFieldsSchema } from "@/features/auth/schemas";

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
