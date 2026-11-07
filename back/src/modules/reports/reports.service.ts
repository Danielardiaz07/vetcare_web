import { AppointmentStatus, Prisma } from "@prisma/client";
import { VACCINE_DUE_SOON_DAYS } from "@/config/constants";
import type { DashboardQueryDto, DashboardResponseDto } from "@/modules/reports/dto/reports.dto";
import type { ReportsRepository } from "@/modules/reports/reports.repository";
import { addDays, clinicDateOf, clinicInstant } from "@/shared/utils/clinic-time";

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
    ]);

    const byStatus = Object.fromEntries(
      Object.values(AppointmentStatus).map((status) => [status, 0]),
    ) as Record<AppointmentStatus, number>;
    for (const row of statusRows) byStatus[row.status] = row._count._all;

    return {
      range: { from, to },
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
