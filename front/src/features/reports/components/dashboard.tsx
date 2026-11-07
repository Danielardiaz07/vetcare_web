"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PAYMENT_METHOD_LABELS } from "@/features/invoices/labels";
import { BarList } from "@/features/reports/components/bar-list";
import { PeriodFilter } from "@/features/reports/components/period-filter";
import { appointmentsCount, formatPercent, invoicesCount } from "@/features/reports/labels";
import type { PeriodInput } from "@/features/reports/schemas";
import { APPOINTMENT_TYPE_LABELS } from "@/features/staff/labels";
import { APPOINTMENT_STATUS } from "@/lib/appointment-status";
import { clinicDateOf, monthRange } from "@/lib/clinic-time";
import { formatCop, formatDate } from "@/lib/format";
import { getDashboard } from "@/services/reports";
import type { AppointmentStatus, DashboardReport } from "@/types/domain";

type ReportState =
  { status: "loading" } | { status: "error" } | { status: "ready"; report: DashboardReport };

const STATUS_ORDER: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "ATTENDED",
  "NO_SHOW",
  "CANCELLED",
];

const NO_DATA = "Sin datos en este periodo.";

export function Dashboard() {
  const [period, setPeriod] = useState<PeriodInput>(() => monthRange(clinicDateOf(new Date())));
  const [state, setState] = useState<ReportState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    getDashboard(period)
      .then((report) => {
        if (active) setState({ status: "ready", report });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [period, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return (
    <div className="flex flex-col gap-6">
      <PeriodFilter
        defaultValues={period}
        loading={state.status === "loading"}
        // Un objeto nuevo vuelve a consultar aunque las fechas no cambien.
        onApply={setPeriod}
      />
      <p className="text-muted">
        Del {formatDate(period.from)} al {formatDate(period.to)}
      </p>

      {state.status === "loading" && <LoadingState rows={4} />}
      {state.status === "error" && <ErrorState onRetry={reload} />}
      {state.status === "ready" && <Indicators report={state.report} />}
    </div>
  );
}

// RN-80: citas por estado, inasistencias, servicios más solicitados e ingresos.
function Indicators({ report }: { report: DashboardReport }) {
  const { appointments, services, revenue } = report;

  if (appointments.total === 0 && revenue.invoices === 0) {
    return (
      <EmptyState
        title="Sin datos en este periodo"
        description="No hay citas ni facturas pagadas entre esas fechas. Prueba con otro periodo."
      />
    );
  }

  const noShows = appointments.byStatus.NO_SHOW;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <IndicatorCard id="appointments-by-status" title="Citas por estado">
        {appointments.total === 0 ? (
          <p className="text-muted">{NO_DATA}</p>
        ) : (
          <>
            <p className="text-muted">{appointmentsCount(appointments.total)} en total</p>
            <BarList
              title="Citas por estado"
              items={STATUS_ORDER.map((status) => ({
                key: status,
                label: APPOINTMENT_STATUS[status].label,
                value: appointments.byStatus[status],
                valueText: appointmentsCount(appointments.byStatus[status]),
              }))}
            />
          </>
        )}
      </IndicatorCard>

      <IndicatorCard id="no-shows" title="Inasistencias">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-4xl font-semibold text-ink">{noShows}</span>
          <span className="text-muted">
            {noShows === 1 ? "cita sin asistir" : "citas sin asistir"}
          </span>
        </p>
        {appointments.noShowRate === null ? (
          <p className="text-muted">
            Aún no hay citas atendidas ni inasistidas para calcular el porcentaje.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {/* RN-80: el porcentaje es sobre las citas que debían atenderse, no sobre el total. */}
            <p className="text-ink">
              <span className="font-semibold">{formatPercent(appointments.noShowRate)}</span> de las
              citas que debían atenderse
            </p>
            <span aria-hidden="true" className="h-3 rounded-r-sm bg-divider">
              <span
                className="block h-full rounded-r-sm bg-brand-600"
                style={{ width: `${appointments.noShowRate}%` }}
              />
            </span>
          </div>
        )}
      </IndicatorCard>

      <IndicatorCard id="top-services" title="Servicios más solicitados">
        {services.length === 0 ? (
          <p className="text-muted">{NO_DATA}</p>
        ) : (
          <>
            <p className="text-muted">Citas por tipo, sin contar las canceladas</p>
            <BarList
              title="Servicios más solicitados"
              items={services.map((service) => ({
                key: service.type,
                label: APPOINTMENT_TYPE_LABELS[service.type],
                value: service.count,
                valueText: appointmentsCount(service.count),
              }))}
            />
          </>
        )}
      </IndicatorCard>

      <IndicatorCard id="revenue" title="Ingresos del periodo">
        <div className="flex flex-col gap-1">
          <span className="text-4xl font-semibold text-ink">{formatCop(revenue.total)}</span>
          <span className="text-muted">
            {invoicesCount(revenue.invoices)} pagadas · sin las anuladas
          </span>
        </div>
        {revenue.invoices === 0 ? (
          <p className="text-muted">{NO_DATA}</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-semibold text-ink">{formatCop(revenue.subtotal)}</dd>
              </div>
              <div>
                <dt className="text-muted">IVA</dt>
                <dd className="font-semibold text-ink">{formatCop(revenue.tax)}</dd>
              </div>
            </dl>
            <BarList
              title="Ingresos por método de pago"
              items={revenue.byPaymentMethod.map((row) => ({
                key: row.method,
                label: PAYMENT_METHOD_LABELS[row.method],
                value: row.total,
                valueText: formatCop(row.total),
              }))}
            />
          </>
        )}
      </IndicatorCard>
    </div>
  );
}

type IndicatorCardProps = {
  id: string;
  title: string;
  children: ReactNode;
};

function IndicatorCard({ id, title, children }: IndicatorCardProps) {
  const titleId = `${id}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
    >
      <h2 id={titleId} className="text-lg font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}
