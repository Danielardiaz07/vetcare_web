import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { ClinicalLimit } from "@/config/constants";
import { paginationQuerySchema } from "@/shared/utils/pagination";

export const createInvoiceRequestSchema = z
  .object({
    ownerId: z.uuid("Identificador invalido"),
    paymentMethod: z.enum(PaymentMethod),
    consultationIds: z.array(z.uuid("Identificador invalido")).default([]),
    vaccinationIds: z.array(z.uuid("Identificador invalido")).default([]),
  })
  .refine((dto) => dto.consultationIds.length + dto.vaccinationIds.length > 0, {
    message: "Selecciona al menos un concepto para facturar",
    path: ["consultationIds"],
  });

export const voidInvoiceRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "El motivo de la anulacion es obligatorio")
    .max(
      ClinicalLimit.VOID_REASON_MAX,
      `El motivo admite maximo ${ClinicalLimit.VOID_REASON_MAX} caracteres`,
    ),
});

export const pendingQuerySchema = z.object({ ownerId: z.uuid("Identificador invalido") });

export const listInvoicesQuerySchema = paginationQuerySchema.extend({
  ownerId: z.uuid("Identificador invalido").optional(),
  status: z.enum(InvoiceStatus).optional(),
});

export const listMyInvoicesQuerySchema = paginationQuerySchema;

export type CreateInvoiceRequestDto = z.infer<typeof createInvoiceRequestSchema>;
export type VoidInvoiceRequestDto = z.infer<typeof voidInvoiceRequestSchema>;
export type PendingQueryDto = z.infer<typeof pendingQuerySchema>;
export type ListInvoicesQueryDto = z.infer<typeof listInvoicesQuerySchema>;
export type ListMyInvoicesQueryDto = z.infer<typeof listMyInvoicesQuerySchema>;

export interface InvoiceItemResponseDto {
  id: string;
  description: string;
  amount: number;
  taxed: boolean;
  tax: number;
  consultationId: string | null;
  vaccinationId: string | null;
}

export interface InvoiceResponseDto {
  id: string;
  number: string;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  owner: { id: string; firstNames: string; lastNames: string; documentNumber: string };
  subtotal: number;
  tax: number;
  total: number;
  voidReason: string | null;
  items: InvoiceItemResponseDto[];
  createdAt: Date;
}

export interface PendingConceptDto {
  kind: "CONSULTATION" | "VACCINATION";
  id: string;
  description: string;
  patientName: string;
  amount: number;
  date: Date;
}
