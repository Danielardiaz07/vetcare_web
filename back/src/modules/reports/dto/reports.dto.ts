import type { AppointmentStatus, AppointmentType, PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { REPORT_DEFAULT_RANGE_DAYS, REPORT_MAX_RANGE_DAYS } from "@/config/constants";
import { dateField } from "@/shared/schemas/fields";
import { addDays, clinicDateOf, daysBetween } from "@/shared/utils/clinic-time";

// Sin fechas, el tablero muestra los últimos REPORT_DEFAULT_RANGE_DAYS días hasta hoy (hora de la clínica).
export const dashboardQuerySchema = z
  .object({ from: dateField.optional(), to: dateField.optional() })
  .transform((query) => {
    const to = query.to ?? clinicDateOf(new Date());
    const from = query.from ?? addDays(to, -(REPORT_DEFAULT_RANGE_DAYS - 1));
    return { from, to };
  })
  .refine((range) => range.from <= range.to, {
    message: "La fecha inicial no puede ser posterior a la final",
    path: ["from"],
  })
  .refine((range) => daysBetween(range.from, range.to) < REPORT_MAX_RANGE_DAYS, {
    message: `El rango maximo es de ${REPORT_MAX_RANGE_DAYS} dias`,
    path: ["to"],
  });

export type DashboardQueryDto = z.infer<typeof dashboardQuerySchema>;

export interface DashboardResponseDto {
  range: { from: string; to: string };
  appointments: {
    total: number;
    byStatus: Record<AppointmentStatus, number>;
    // NO_SHOW / (ATTENDED + NO_SHOW), en %; null si aún no hay citas que debieran haberse atendido.
    noShowRate: number | null;
  };
  // Servicios más solicitados: citas por tipo, sin contar las canceladas, de mayor a menor.
  services: { type: AppointmentType; count: number }[];
  // Solo facturas pagadas: las anuladas no suman. byDay incluye únicamente los días con ventas.
  revenue: {
    invoices: number;
    subtotal: number;
    tax: number;
    total: number;
    byPaymentMethod: { method: PaymentMethod; invoices: number; total: number }[];
    byDay: { date: string; total: number }[];
  };
  newPatients: number;
  newOwners: number;
  // Estado actual, no depende del rango.
  openHospitalizations: number;
  vaccines: { overdue: number; dueSoon: number };
}
