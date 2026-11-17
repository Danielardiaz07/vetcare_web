import { z } from "zod";
import { ClinicalLimit, FieldLimit, InventoryLimit } from "@/config/constants";
import { dateField, moneyField } from "@/shared/schemas/fields";
import { paginationQuerySchema } from "@/shared/utils/pagination";

const nameField = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(max, `El nombre admite maximo ${max} caracteres`);

// RN-57: el stock nunca queda negativo.
const stockField = z
  .number("Debe ser un numero")
  .int("Debe ser un numero entero")
  .min(0, "No puede ser negativo")
  .max(InventoryLimit.STOCK_MAX, `Maximo ${InventoryLimit.STOCK_MAX}`);

const atLeastOneField = (data: object) => Object.keys(data).length > 0;
const AT_LEAST_ONE = "Envia al menos un campo para actualizar";

export const createMedicationRequestSchema = z.object({
  name: nameField(InventoryLimit.MEDICATION_NAME_MAX),
  price: moneyField,
  stock: stockField.default(0),
  minStock: stockField.default(0),
  expiresAt: dateField.optional(),
});

// expiresAt: null borra el vencimiento (producto sin fecha).
export const updateMedicationRequestSchema = z
  .object({
    name: nameField(InventoryLimit.MEDICATION_NAME_MAX),
    price: moneyField,
    stock: stockField,
    minStock: stockField,
    expiresAt: dateField.nullable(),
    active: z.boolean(),
  })
  .partial()
  .refine(atLeastOneField, AT_LEAST_ONE);

export const updateVaccineRequestSchema = z
  .object({
    name: nameField(ClinicalLimit.VACCINE_NAME_MAX),
    price: moneyField,
    stock: stockField,
    minStock: stockField,
    expiresAt: dateField.nullable(),
    active: z.boolean(),
  })
  .partial()
  .refine(atLeastOneField, AT_LEAST_ONE);

export const INVENTORY_ALERT_FILTERS = ["LOW_STOCK", "EXPIRING"] as const;

export const listInventoryQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(FieldLimit.SEARCH_MAX).optional(),
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  // EXPIRING incluye también los ya vencidos.
  alert: z.enum(INVENTORY_ALERT_FILTERS).optional(),
});

export type CreateMedicationRequestDto = z.infer<typeof createMedicationRequestSchema>;
export type UpdateMedicationRequestDto = z.infer<typeof updateMedicationRequestSchema>;
export type UpdateVaccineRequestDto = z.infer<typeof updateVaccineRequestSchema>;
export type ListInventoryQueryDto = z.infer<typeof listInventoryQuerySchema>;

export type ExpiryStatus = "NONE" | "OK" | "EXPIRING" | "EXPIRED";

// lowStock y expiry se calculan siempre; las alertas y el filtro `alert` solo consideran productos activos.
export interface InventoryItemDto {
  id: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  expiresAt: string | null;
  active: boolean;
  lowStock: boolean;
  expiry: ExpiryStatus;
}

export type InventoryAlertReason = "LOW_STOCK" | "EXPIRING" | "EXPIRED";

export interface InventoryAlertDto {
  kind: "MEDICATION" | "VACCINE";
  id: string;
  name: string;
  stock: number;
  minStock: number;
  expiresAt: string | null;
  reasons: InventoryAlertReason[];
}

export interface InventoryAlertsResponseDto {
  expiringDays: number;
  counts: { lowStock: number; expiring: number; expired: number };
  items: InventoryAlertDto[];
}
