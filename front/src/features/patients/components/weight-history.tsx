"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WeightChangeNotice } from "@/features/patients/components/weight-change-notice";
import { WeightChart } from "@/features/patients/components/weight-chart";
import { clinicDateOf } from "@/lib/clinic-time";
import { formatDate } from "@/lib/format";
import { getWeightTrend } from "@/services/clinical";
import type { WeightTrend } from "@/types/domain";

const weightFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
type State = { status: "loading" } | { status: "error" } | { status: "ready"; data: WeightTrend };

type WeightHistoryProps = {
  patientId: string;
  patientName: string;
  staff?: boolean;
  compact?: boolean;
  refreshKey?: number;
};

export function WeightHistory({
  patientId,
  patientName,
  staff = false,
  compact = false,
  refreshKey,
}: WeightHistoryProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const request = useRef<{ key: string; promise: Promise<WeightTrend> } | null>(null);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    const key = `${patientId}:${staff}:${refreshKey ?? 0}:${retry}`;
    if (request.current?.key !== key) {
      request.current = { key, promise: getWeightTrend(patientId, staff) };
    }
    request.current.promise
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [patientId, staff, refreshKey, retry]);

  const loading = (
    <div
      role="status"
      className={
        compact
          ? "h-11 animate-pulse rounded-control bg-divider motion-reduce:animate-none"
          : "h-72 animate-pulse rounded-control bg-divider motion-reduce:animate-none"
      }
    >
      <span className="sr-only">Cargando evolución del peso…</span>
    </div>
  );
  const error = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="alert" className="text-sm text-danger">
        No pudimos cargar la evolución del peso.
      </p>
      <Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>
        Reintentar
      </Button>
    </div>
  );

  if (compact) {
    if (state.status === "loading") return loading;
    if (state.status === "error") return error;
    if (!state.data.change) return null;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">Último cambio de peso registrado</p>
        <WeightChangeNotice change={state.data.change} />
      </div>
    );
  }

  const latest = state.status === "ready" ? state.data.points.at(-1) : undefined;
  return (
    <section
      aria-label={`Evolución del peso de ${patientName}`}
      className="flex min-w-0 flex-col gap-5 rounded-card border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">Evolución del peso</h2>
        {latest && (
          <p className="flex flex-col items-start gap-0.5 sm:items-end">
            <span className="text-sm text-subtle">Última consulta</span>
            <span className="text-xl font-semibold text-ink">
              {weightFormatter.format(latest.weightKg)} kg
            </span>
            <span className="text-sm text-subtle">
              {formatDate(clinicDateOf(new Date(latest.date)))}
            </span>
          </p>
        )}
      </div>
      {state.status === "loading" ? (
        loading
      ) : state.status === "error" ? (
        error
      ) : (
        <>
          <WeightChangeNotice change={state.data.change} />
          <WeightChart
            points={state.data.points}
            flagged={state.data.change?.flagged ?? false}
            patientName={patientName}
          />
          {state.data.points.length > 0 && (
            <details className="border-t border-line pt-2">
              <summary className="min-h-11 cursor-pointer content-center font-medium text-brand-700">
                Ver registros de peso
              </summary>
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Registros de peso de {patientName}</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="py-3 font-medium text-subtle">
                      Fecha
                    </th>
                    <th scope="col" className="py-3 text-right font-medium text-subtle">
                      Peso (kg)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.points.map((point) => (
                    <tr key={point.consultationId} className="border-b border-line last:border-0">
                      <td className="py-3">
                        <time dateTime={point.date}>
                          {formatDate(clinicDateOf(new Date(point.date)))}
                        </time>
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {weightFormatter.format(point.weightKg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </>
      )}
    </section>
  );
}
