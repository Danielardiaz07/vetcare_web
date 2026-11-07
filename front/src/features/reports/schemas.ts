import { z } from "zod";
import { daysBetween } from "@/lib/clinic-time";
import { REPORT_MAX_RANGE_DAYS } from "@/lib/constants";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const dateField = (missing: string) => z.string().regex(DATE, missing);

// D-35: las mismas reglas del rango que valida la API.
export const periodSchema = z
  .object({
    from: dateField("Elige la fecha inicial"),
    to: dateField("Elige la fecha final"),
  })
  .refine((period) => period.from <= period.to, {
    message: "La fecha inicial no puede ser posterior a la final",
    path: ["from"],
  })
  .refine((period) => daysBetween(period.from, period.to) < REPORT_MAX_RANGE_DAYS, {
    message: `El periodo admite máximo ${REPORT_MAX_RANGE_DAYS} días`,
    path: ["to"],
  });

export type PeriodInput = z.infer<typeof periodSchema>;
