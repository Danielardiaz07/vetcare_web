import { AppointmentStatus, Prisma, type AppointmentType, type PaymentMethod } from "@prisma/client";
import { VACCINE_DUE_SOON_DAYS } from "@/config/constants";
import type {
  DashboardQueryDto,
  DashboardResponseDto,
  PreviousPeriodDto,
} from "@/modules/reports/dto/reports.dto";
import type { ReportsRepository } from "@/modules/reports/reports.repository";
import { addDays, clinicDateOf, clinicInstant, daysBetween } from "@/shared/utils/clinic-time";
import { toCsv, type CsvCell } from "@/shared/utils/csv";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendadas",
  CONFIRMED: "Confirmadas",
  ATTENDED: "Atendidas",
  CANCELLED: "Canceladas",
  NO_SHOW: "No asistió",
};
const TYPE_LABEL: Record<AppointmentType, string> = {
  GENERAL_CONSULTATION: "Consulta general",
  VACCINATION: "Vacunación",
  CHECKUP: "Control",
  GROOMING: "Estética",
};
const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

const PERCENT = 100;
const RATE_DECIMALS = 10; // un decimal: 12,5 %

const money = (value: Prisma.Decimal | null): number => (value ?? new Prisma.Decimal(0)).toNumber();

export class ReportsService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  // RF-24, RN-80: solo el administrador ve el tablero.
  async dashboard({ from, to }: DashboardQueryDto): Promise<DashboardResponseDto> {
    const period = { from: clinicInstant(from, 0), to: clinicInstant(addDays(to, 1), 0) };

    const [
      statusRows,
      typeRows,
      totals,
      methodRows,
      invoiceRows,
      newPatients,
      newOwners,
      openHospitalizations,
      nextDoses,
      previous,
    ] = await Promise.all([
      this.repository.appointmentsByStatus(period),
      this.repository.appointmentsByType(period),
      this.repository.paidInvoiceTotals(period),
      this.repository.paidInvoicesByMethod(period),
      this.repository.paidInvoiceDates(period),
      this.repository.countPatients(period),
      this.repository.countOwners(period),
      this.repository.countOpenHospitalizations(),
      this.repository.latestNextDoses(),
      this.previousPeriod(from, to),
    ]);

    const byStatus = this.countByStatus(statusRows);

    return {
      range: { from, to },
      previous,
      appointments: {
        total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
        byStatus,
        noShowRate: this.noShowRate(byStatus),
      },
      services: typeRows
        .map((row) => ({ type: row.type, count: row._count._all }))
        .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)),
      revenue: {
        invoices: totals._count._all,
        subtotal: money(totals._sum.subtotal),
        tax: money(totals._sum.tax),
        total: money(totals._sum.total),
        byPaymentMethod: methodRows
          .map((row) => ({
            method: row.paymentMethod,
            invoices: row._count._all,
            total: money(row._sum.total),
          }))
          .sort((a, b) => b.total - a.total),
        byDay: this.revenueByDay(invoiceRows),
      },
      newPatients,
      newOwners,
      openHospitalizations,
      vaccines: this.vaccineStatus(nextDoses),
    };
  }

  // D-53: los mismos indicadores del tablero en un CSV que abre Excel, sección por sección.
  async dashboardCsv(query: DashboardQueryDto): Promise<string> {
    const d = await this.dashboard(query);
    const blank: CsvCell[] = [];
    const rows: CsvCell[][] = [
      ["Tablero de indicadores VetCare"],
      ["Desde", d.range.from, "Hasta", d.range.to],
      blank,
      ["Citas", "Cantidad"],
      ["Total", d.appointments.total],
      ...Object.values(AppointmentStatus).map((status): CsvCell[] => [
        STATUS_LABEL[status],
        d.appointments.byStatus[status],
      ]),
      ["Tasa de inasistencia (%)", d.appointments.noShowRate],
      blank,
      ["Servicio", "Citas"],
      ...d.services.map((service): CsvCell[] => [TYPE_LABEL[service.type], service.count]),
      blank,
      ["Ingresos (facturas pagadas)", "Valor"],
      ["Facturas", d.revenue.invoices],
      ["Subtotal", d.revenue.subtotal],
      ["IVA", d.revenue.tax],
      ["Total", d.revenue.total],
      blank,
      ["Método de pago", "Facturas", "Total"],
      ...d.revenue.byPaymentMethod.map((row): CsvCell[] => [
        METHOD_LABEL[row.method],
        row.invoices,
        row.total,
      ]),
      blank,
      ["Día", "Ingresos"],
      ...d.revenue.byDay.map((row): CsvCell[] => [row.date, row.total]),
      blank,
      ["Altas y estado actual", "Cantidad"],
      ["Mascotas nuevas", d.newPatients],
      ["Propietarios nuevos", d.newOwners],
      ["Internaciones abiertas", d.openHospitalizations],
      ["Vacunas vencidas", d.vaccines.overdue],
      ["Vacunas por vencer", d.vaccines.dueSoon],
      blank,
      ["Periodo anterior", d.previous.range.from, d.previous.range.to],
      ["Citas", d.previous.appointments.total],
      ["Tasa de inasistencia (%)", d.previous.appointments.noShowRate],
      ["Facturas", d.previous.revenue.invoices],
      ["Ingresos", d.previous.revenue.total],
      ["Mascotas nuevas", d.previous.newPatients],
      ["Propietarios nuevos", d.previous.newOwners],
    ];
    return toCsv(rows);
  }

  // D-53: el periodo anterior termina el día antes de `from` y dura lo mismo que el elegido.
  private async previousPeriod(from: string, to: string): Promise<PreviousPeriodDto> {
    const length = daysBetween(from, to) + 1;
    const previousTo = addDays(from, -1);
    const previousFrom = addDays(previousTo, -(length - 1));
    const period = {
      from: clinicInstant(previousFrom, 0),
      to: clinicInstant(addDays(previousTo, 1), 0),
    };

    const [statusRows, totals, newPatients, newOwners] = await Promise.all([
      this.repository.appointmentsByStatus(period),
      this.repository.paidInvoiceTotals(period),
      this.repository.countPatients(period),
      this.repository.countOwners(period),
    ]);
    const byStatus = this.countByStatus(statusRows);

    return {
      range: { from: previousFrom, to: previousTo },
      appointments: {
        total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
        noShowRate: this.noShowRate(byStatus),
      },
      revenue: { invoices: totals._count._all, total: money(totals._sum.total) },
      newPatients,
      newOwners,
    };
  }

  private countByStatus(
    rows: { status: AppointmentStatus; _count: { _all: number } }[],
  ): Record<AppointmentStatus, number> {
    const byStatus = Object.fromEntries(
      Object.values(AppointmentStatus).map((status) => [status, 0]),
    ) as Record<AppointmentStatus, number>;
    for (const row of rows) byStatus[row.status] = row._count._all;
    return byStatus;
  }

  private noShowRate(byStatus: Record<AppointmentStatus, number>): number | null {
    const due = byStatus.ATTENDED + byStatus.NO_SHOW;
    if (due === 0) return null;
    return Math.round((byStatus.NO_SHOW / due) * PERCENT * RATE_DECIMALS) / RATE_DECIMALS;
  }

  private revenueByDay(rows: { createdAt: Date; total: Prisma.Decimal }[]) {
    const perDay = new Map<string, Prisma.Decimal>();
    for (const row of rows) {
      const day = clinicDateOf(row.createdAt);
      perDay.set(day, (perDay.get(day) ?? new Prisma.Decimal(0)).add(row.total));
    }
    return [...perDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total: total.toNumber() }));
  }

  // Mismos umbrales que el carné de vacunación (RN-49).
  private vaccineStatus(nextDoses: (Date | null)[]): { overdue: number; dueSoon: number } {
    const today = clinicDateOf(this.clock());
    const limit = addDays(today, VACCINE_DUE_SOON_DAYS);
    let overdue = 0;
    let dueSoon = 0;
    for (const dose of nextDoses) {
      if (!dose) continue;
      const date = dose.toISOString().slice(0, today.length);
      if (date < today) overdue += 1;
      else if (date <= limit) dueSoon += 1;
    }
    return { overdue, dueSoon };
  }
}
