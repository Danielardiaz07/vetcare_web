import { z } from "zod";
import { FIELD_LIMITS } from "@/lib/constants";

const { PRICE_MAX, PRICE_DECIMALS, STOCK_MAX } = FIELD_LIMITS;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PRICE_FACTOR = 10 ** PRICE_DECIMALS;

// RN-57: el stock y el mínimo nunca son negativos.
const unitsField = (label: string) =>
  z
    .number(`Escribe ${label}`)
    .int(`Escribe ${label} sin decimales`)
    .min(0, "No puede ser negativo")
    .max(STOCK_MAX, `Máximo ${STOCK_MAX.toLocaleString("es-CO")} unidades`);

// El nombre cambia de tope según la tabla (medicamento o vacuna).
export const inventoryItemSchema = (nameMax: number) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, "Escribe el nombre")
      .max(nameMax, `El nombre admite máximo ${nameMax} caracteres`),
    price: z
      .number("Escribe el precio")
      .min(0, "El precio no puede ser negativo")
      .max(PRICE_MAX, "El precio es demasiado alto")
      .refine(
        (value) => Math.round(value * PRICE_FACTOR) / PRICE_FACTOR === value,
        `Máximo ${PRICE_DECIMALS} decimales`,
      ),
    stock: unitsField("el stock"),
    minStock: unitsField("el stock mínimo"),
    // Vacío = sin fecha de vencimiento.
    expiresAt: z.union([z.literal(""), z.string().regex(ISO_DATE, "Fecha inválida")]),
    active: z.boolean(),
  });

export type InventoryItemFormInput = z.infer<ReturnType<typeof inventoryItemSchema>>;
