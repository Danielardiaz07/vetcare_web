import { DocumentType } from "@prisma/client";
import { z } from "zod";
import { FieldLimit } from "@/config/constants";
import {
  addressField,
  documentNumberField,
  emailField,
  phoneField,
  requiredNameField,
} from "@/shared/schemas/fields";
import { paginationQuerySchema } from "@/shared/utils/pagination";

export const createOwnerRequestSchema = z.object({
  documentType: z.enum(DocumentType).default(DocumentType.CC),
  documentNumber: documentNumberField,
  firstNames: requiredNameField("Los nombres"),
  lastNames: requiredNameField("Los apellidos"),
  email: emailField.optional(),
  phone: phoneField,
  address: addressField.optional(),
});

// La cédula y su tipo identifican al propietario (RN-17): no se editan.
export const updateOwnerRequestSchema = z
  .object({
    firstNames: requiredNameField("Los nombres"),
    lastNames: requiredNameField("Los apellidos"),
    email: emailField.nullable(),
    phone: phoneField,
    address: addressField.nullable(),
    active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Envia al menos un campo para actualizar");

export const listOwnersQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(FieldLimit.SEARCH_MAX).optional(),
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export type CreateOwnerRequestDto = z.infer<typeof createOwnerRequestSchema>;
export type UpdateOwnerRequestDto = z.infer<typeof updateOwnerRequestSchema>;
export type ListOwnersQueryDto = z.infer<typeof listOwnersQuerySchema>;

export interface OwnerResponseDto {
  id: string;
  documentType: string;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  email: string | null;
  phone: string;
  address: string | null;
  active: boolean;
  hasAccount: boolean;
  createdAt: Date;
}
