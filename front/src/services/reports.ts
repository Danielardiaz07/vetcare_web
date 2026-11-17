import { PAYMENT_METHOD_LABELS } from "@/features/invoices/labels";
import { APPOINTMENT_TYPE_LABELS } from "@/features/staff/labels";
import { APPOINTMENT_STATUS } from "@/lib/appointment-status";
import { addDays, clinicDateOf, daysBetween, isSunday } from "@/lib/clinic-time";
import { IVA_RATE_PERCENT } from "@/lib/constants";
import { request, requestBlob } from "@/services/http-client";
import { isMockEnabled, isNewAccount, mockResponse } from "@/services/mocks";
import type { AppointmentType, DashboardReport, PaymentMethod } from "@/types/domain";

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
const MOCK_HISTORY_DAYS = 60;
const METHODS: PaymentMethod[] = ["CARD", "CASH", "TRANSFER"];

function mockPeriod(range: DashboardParams): Omit<DashboardReport, "previous"> {
  const today = clinicDateOf(new Date());
  const byStatus = { ...EMPTY_BY_STATUS };
  const services = new Map<AppointmentType, number>();
  const payments = new Map<PaymentMethod, { invoices: number; total: number }>();
  const byDay: DashboardReport["revenue"]["byDay"] = [];
  let subtotal = 0;
  let tax = 0;
  let invoices = 0;
  let newPatients = 0;
  let newOwners = 0;

  for (let offset = 0; offset < MOCK_HISTORY_DAYS && !isNewAccount; offset++) {
    const date = addDays(today, -offset);
    if (date < range.from || date > range.to || isSunday(date)) continue;
    const seed = daysBetween("2020-01-01", date);
    const attended = 5 + (seed % 5);
    const noShows = seed % 5 === 0 ? 1 : 0;
    const scheduled = offset === 0 ? 2 : 0;
    const confirmed = offset === 0 ? 1 : 0;
    const cancelled = seed % 7 === 0 ? 1 : 0;
    byStatus.ATTENDED += attended;
    byStatus.NO_SHOW += noShows;
    byStatus.SCHEDULED += scheduled;
    byStatus.CONFIRMED += confirmed;
    byStatus.CANCELLED += cancelled;
    const grooming = seed % 3;
    const vaccinations = seed % 2;
    const counts: [AppointmentType, number][] = [
      [
        "GENERAL_CONSULTATION",
        attended - grooming - vaccinations - 1 + noShows + scheduled + confirmed,
      ],
      ["GROOMING", grooming],
      ["VACCINATION", vaccinations],
      ["CHECKUP", 1],
    ];
    for (const [type, count] of counts) services.set(type, (services.get(type) ?? 0) + count);
    const daySubtotal = attended * (85_000 + (seed % 3) * 15_000);
    const dayTax = Math.round(daySubtotal * IVA_RATE_PERCENT) / 100;
    const total = daySubtotal + dayTax;
    subtotal += daySubtotal;
    tax += dayTax;
    invoices += attended;
    byDay.push({ date, total });
    const method = METHODS[seed % METHODS.length]!;
    const payment = payments.get(method) ?? { invoices: 0, total: 0 };
    payments.set(method, { invoices: payment.invoices + attended, total: payment.total + total });
    newPatients += seed % 3;
    newOwners += Math.min(seed % 3, (seed % 2) + 1);
  }
  const due = byStatus.ATTENDED + byStatus.NO_SHOW;
  return {
    range,
    appointments: {
      total: Object.values(byStatus).reduce((sum, value) => sum + value, 0),
      byStatus,
      noShowRate: due ? Math.round((byStatus.NO_SHOW / due) * 1000) / 10 : null,
    },
    services: [...services]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    revenue: {
      invoices,
      subtotal,
      tax,
      total: subtotal + tax,
      byPaymentMethod: [...payments]
        .map(([method, values]) => ({ method, ...values }))
        .sort((a, b) => b.total - a.total),
      byDay: byDay.sort((a, b) => a.date.localeCompare(b.date)),
    },
    newPatients,
    newOwners,
    openHospitalizations: isNewAccount ? 0 : 1,
    vaccines: { overdue: isNewAccount ? 0 : 2, dueSoon: isNewAccount ? 0 : 3 },
  };
}

function mockDashboard(range: DashboardParams): DashboardReport {
  const length = daysBetween(range.from, range.to) + 1;
  const previousTo = addDays(range.from, -1);
  const previous = mockPeriod({ from: addDays(previousTo, -(length - 1)), to: previousTo });
  return {
    ...mockPeriod(range),
    previous: {
      range: previous.range,
      appointments: {
        total: previous.appointments.total,
        noShowRate: previous.appointments.noShowRate,
      },
      revenue: { invoices: previous.revenue.invoices, total: previous.revenue.total },
      newPatients: previous.newPatients,
      newOwners: previous.newOwners,
    },
  };
}

function mockDashboardCsv(report: DashboardReport): Blob {
  type Cell = string | number | null;
  const rows: Cell[][] = [
    ["Tablero de indicadores VetCare"],
    ["Desde", report.range.from, "Hasta", report.range.to],
    [],
    ["Citas", "Cantidad"],
    ["Total", report.appointments.total],
    ...Object.entries(report.appointments.byStatus).map(([status, count]) => [
      APPOINTMENT_STATUS[status as keyof typeof APPOINTMENT_STATUS].label,
      count,
    ]),
    ["Tasa de inasistencia (%)", report.appointments.noShowRate],
    [],
    ["Servicio", "Citas"],
    ...report.services.map((row) => [APPOINTMENT_TYPE_LABELS[row.type], row.count]),
    [],
    ["Ingresos (facturas pagadas)", "Valor"],
    ["Facturas", report.revenue.invoices],
    ["Subtotal", report.revenue.subtotal],
    ["IVA", report.revenue.tax],
    ["Total", report.revenue.total],
    [],
    ["Método de pago", "Facturas", "Total"],
    ...report.revenue.byPaymentMethod.map((row) => [
      PAYMENT_METHOD_LABELS[row.method],
      row.invoices,
      row.total,
    ]),
    [],
    ["Día", "Ingresos"],
    ...report.revenue.byDay.map((row) => [row.date, row.total]),
    [],
    ["Altas y estado actual", "Cantidad"],
    ["Mascotas nuevas", report.newPatients],
    ["Propietarios nuevos", report.newOwners],
    ["Internaciones abiertas", report.openHospitalizations],
    ["Vacunas vencidas", report.vaccines.overdue],
    ["Vacunas por vencer", report.vaccines.dueSoon],
  ];
  const previous = report.previous;
  if (previous)
    rows.push(
      [],
      ["Periodo anterior", previous.range.from, previous.range.to],
      ["Citas", previous.appointments.total],
      ["Tasa de inasistencia (%)", previous.appointments.noShowRate],
      ["Facturas", previous.revenue.invoices],
      ["Ingresos", previous.revenue.total],
      ["Mascotas nuevas", previous.newPatients],
      ["Propietarios nuevos", previous.newOwners],
    );
  const cellText = (cell: Cell) => {
    if (cell === null) return "";
    if (typeof cell === "number") return String(cell).replace(".", ",");
    return '"' + cell.replaceAll('"', '""') + '"';
  };
  const csv = "\ufeff" + rows.map((row) => row.map(cellText).join(";")).join("\r\n") + "\r\n";
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}

export function getDashboard(params: DashboardParams): Promise<DashboardReport> {
  if (isMockEnabled) return mockResponse(mockDashboard(params));
  return request<DashboardReport>("/reports/dashboard", { query: { ...params } });
}

export async function exportDashboard(params: DashboardParams): Promise<Blob> {
  if (isMockEnabled) {
    const report = await mockResponse(mockDashboard(params));
    return mockDashboardCsv(report);
  }
  return requestBlob("/reports/dashboard/export", { query: { ...params } });
}
