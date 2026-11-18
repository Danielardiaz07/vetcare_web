import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { percentageChange } from "@/features/reports/dashboard-data";
import { formatPercent } from "@/features/reports/labels";
import { formatCop, formatDate } from "@/lib/format";
import type { DashboardReport } from "@/types/domain";

const countFormatter = new Intl.NumberFormat("es-CO");
const changeFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function PeriodComparison({ report }: { report: DashboardReport }) {
  const previous = report.previous;
  if (!previous) {
    return (
      <p className="text-sm text-muted">La comparación no está disponible para este periodo.</p>
    );
  }
  const rows = [
    {
      label: "Ingresos",
      current: report.revenue.total,
      previous: previous.revenue.total,
      format: formatCop,
    },
    {
      label: "Facturas pagadas",
      current: report.revenue.invoices,
      previous: previous.revenue.invoices,
      format: countFormatter.format,
    },
    {
      label: "Citas",
      current: report.appointments.total,
      previous: previous.appointments.total,
      format: countFormatter.format,
    },
    {
      label: "Tasa de inasistencia",
      current: report.appointments.noShowRate,
      previous: previous.appointments.noShowRate,
      format: formatPercent,
      lowerIsBetter: true,
    },
    {
      label: "Mascotas nuevas",
      current: report.newPatients,
      previous: previous.newPatients,
      format: countFormatter.format,
    },
    {
      label: "Propietarios nuevos",
      current: report.newOwners,
      previous: previous.newOwners,
      format: countFormatter.format,
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div
        role="region"
        aria-label="Comparación de periodos"
        tabIndex={0}
        className="relative overflow-x-auto"
      >
        <table className="w-full min-w-[42rem] border-separate border-spacing-0 text-sm tabular-nums">
          <caption className="sr-only">
            Indicadores del periodo consultado frente al periodo anterior de igual duración
          </caption>
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[27%]" />
            <col className="w-[27%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className="text-muted">
            <tr>
              <th
                scope="col"
                className="border-b border-line py-4 pr-4 text-left align-top font-medium"
              >
                Indicador
              </th>
              <th
                scope="col"
                className="rounded-t-control border-b border-brand-200 bg-brand-100 px-4 py-4 text-right align-top text-brand-700"
              >
                <span className="block font-semibold">Periodo actual</span>
                <span className="mt-1 block text-xs leading-5 font-normal">
                  <time dateTime={report.range.from}>{formatDate(report.range.from)}</time>
                  {" – "}
                  <time dateTime={report.range.to}>{formatDate(report.range.to)}</time>
                </span>
              </th>
              <th
                scope="col"
                className="border-b border-line px-4 py-4 text-right align-top font-medium"
              >
                <span className="block">Periodo anterior</span>
                <span className="mt-1 block text-xs leading-5 font-normal">
                  <time dateTime={previous.range.from}>{formatDate(previous.range.from)}</time>
                  {" – "}
                  <time dateTime={previous.range.to}>{formatDate(previous.range.to)}</time>
                </span>
              </th>
              <th
                scope="col"
                className="border-b border-line py-4 pl-4 text-right align-top font-medium"
              >
                Variación
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const change = percentageChange(row.current, row.previous);
              const variation = change === null ? null : Math.round(change * 10) / 10 || 0;
              const favorable =
                variation === null || variation === 0
                  ? null
                  : row.lowerIsBetter
                    ? variation < 0
                    : variation > 0;
              const last = index === rows.length - 1;
              return (
                <tr key={row.label}>
                  <th
                    scope="row"
                    className={cn(
                      "py-3 pr-4 text-left font-medium",
                      !last && "border-b border-line",
                    )}
                  >
                    {row.label}
                  </th>
                  <td
                    className={cn(
                      "bg-brand-50 px-4 py-3 text-right font-semibold whitespace-nowrap",
                      last ? "rounded-b-control" : "border-b border-brand-200",
                    )}
                  >
                    {row.current === null ? "—" : row.format(row.current)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right whitespace-nowrap text-muted",
                      !last && "border-b border-line",
                    )}
                  >
                    {row.previous === null ? "—" : row.format(row.previous)}
                  </td>
                  <td
                    className={cn(
                      "py-3 pl-4 text-right font-semibold whitespace-nowrap",
                      favorable === null
                        ? "text-muted"
                        : favorable
                          ? "text-success"
                          : "text-warning",
                      !last && "border-b border-line",
                    )}
                  >
                    {variation === null ? (
                      <span aria-label="Variación no calculable">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="sr-only">
                          {favorable === null
                            ? "Sin cambios: "
                            : favorable
                              ? "Variación favorable: "
                              : "Variación desfavorable: "}
                        </span>
                        {variation !== 0 && (
                          <Icon
                            name="arrow-right"
                            className={cn(
                              "size-4 shrink-0",
                              variation > 0 ? "-rotate-90" : "rotate-90",
                            )}
                          />
                        )}
                        <span>{changeFormatter.format(variation)} %</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        La variación porcentual queda sin calcular cuando el valor anterior es cero o falta un dato.
      </p>
    </div>
  );
}
