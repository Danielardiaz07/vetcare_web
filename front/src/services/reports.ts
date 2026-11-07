import { clinicDateOf } from "@/lib/clinic-time";
import { request } from "@/services/http-client";
import { isMockEnabled, mockResponse } from "@/services/mocks";
import type { DashboardReport } from "@/types/domain";

export interface DashboardParams {
  from: string;
  to: string;
}

const EMPTY_BY_STATUS: DashboardReport["appointments"]["byStatus"] = {
  SCHEDULED: 0,
  CONFIRMED: 0,
  ATTENDED: 0,
  CANCELLED: 0,
  NO_SHOW: 0,
};

// Datos de ejemplo cuando el rango incluye hoy; cualquier otro rango sale vacío para ver ese estado.
function mockDashboard({ from, to }: DashboardParams): DashboardReport {
  const today = clinicDateOf(new Date());
  const current = {
    newPatients: 0,
    newOwners: 0,
    openHospitalizations: 1,
    vaccines: { overdue: 2, dueSoon: 3 },
  };
  if (today < from || today > to) {
    return {
      range: { from, to },
      appointments: { total: 0, byStatus: EMPTY_BY_STATUS, noShowRate: null },
      services: [],
      revenue: { invoices: 0, subtotal: 0, tax: 0, total: 0, byPaymentMethod: [], byDay: [] },
      ...current,
    };
  }
  return {
    range: { from, to },
    appointments: {
      total: 42,
      byStatus: { SCHEDULED: 8, CONFIRMED: 5, ATTENDED: 21, CANCELLED: 4, NO_SHOW: 4 },
      noShowRate: 16,
    },
    services: [
      { type: "GENERAL_CONSULTATION", count: 17 },
      { type: "VACCINATION", count: 11 },
      { type: "GROOMING", count: 7 },
      { type: "CHECKUP", count: 3 },
    ],
    revenue: {
      invoices: 19,
      subtotal: 1_870_000,
      tax: 355_300,
      total: 2_225_300,
      byPaymentMethod: [
        { method: "CARD", invoices: 9, total: 1_154_300 },
        { method: "CASH", invoices: 7, total: 702_100 },
        { method: "TRANSFER", invoices: 3, total: 368_900 },
      ],
      byDay: [{ date: today, total: 2_225_300 }],
    },
    ...current,
    newPatients: 6,
    newOwners: 4,
  };
}

// RF-24 y D-35: solo el ADMIN; la API rechaza rangos de más de 366 días.
export function getDashboard(params: DashboardParams): Promise<DashboardReport> {
  if (isMockEnabled) return mockResponse(mockDashboard(params));
  return request<DashboardReport>("/reports/dashboard", { query: { ...params } });
}
