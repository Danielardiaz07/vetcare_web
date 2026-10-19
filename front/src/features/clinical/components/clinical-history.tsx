"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { HistoryEntry } from "@/features/clinical/components/history-entry";
import { getMyPatientHistory, type HistoryFilters, type HistoryType } from "@/services/clinical";
import type { HistoryEntry as Entry, Patient, VaccinationCardEntry } from "@/types/domain";

// Solo las pestañas que la API devuelve hoy; cirugías, internaciones y laboratorio llegan después.
const TABS: { type: HistoryType; label: string }[] = [
  { type: "CONSULTATION", label: "Consultas" },
  { type: "VACCINATION", label: "Vacunaciones" },
];

const tabId = (type: HistoryType) => `history-tab-${type}`;
const panelId = (type: HistoryType) => `history-panel-${type}`;

type LoadState =
  { status: "loading" } | { status: "error" } | { status: "ready"; entries: Entry[] };

type ClinicalHistoryProps = {
  pet: Patient;
  // Carné de la mascota: da el estado de la última dosis de cada vacuna (RN-49).
  card: VaccinationCardEntry[];
};

export function ClinicalHistory({ pet, card }: ClinicalHistoryProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [tab, setTab] = useState<HistoryType>("CONSULTATION");
  const rangeError =
    filters.from && filters.to && filters.to < filters.from
      ? "La fecha final no puede ser anterior a la inicial"
      : undefined;

  useEffect(() => {
    if (rangeError) return;
    let active = true;
    setState({ status: "loading" });
    getMyPatientHistory(pet.id, filters)
      .then((entries) => {
        if (active) setState({ status: "ready", entries });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [pet.id, filters, rangeError, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const filtered = Boolean(filters.from || filters.to);

  if (state.status === "ready" && state.entries.length === 0 && !filtered) {
    return (
      <EmptyState
        title="Aún no hay historial"
        description={`Aquí verás cada atención de ${pet.name}.`}
      />
    );
  }

  const entries = state.status === "ready" ? state.entries : [];
  const countOf = (type: HistoryType) => entries.filter((entry) => entry.kind === type).length;
  // Si la pestaña elegida queda vacía con el filtro, se muestra la primera que tenga registros.
  const current =
    countOf(tab) > 0 ? tab : (TABS.find((item) => countOf(item.type) > 0)?.type ?? tab);
  const visible = entries.filter((entry) => entry.kind === current);
  const statusOf = (entry: Entry) =>
    entry.kind === "VACCINATION"
      ? card.find((item) => item.id === entry.vaccination.id)?.status
      : undefined;

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const enabled = TABS.filter((item) => countOf(item.type) > 0);
    const index = enabled.findIndex((item) => item.type === current);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = enabled[(index + step + enabled.length) % enabled.length]?.type;
    if (!next) return;
    setTab(next);
    document.getElementById(tabId(next))?.focus();
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
          <Field
            label="Desde"
            type="date"
            value={filters.from ?? ""}
            max={filters.to}
            onChange={(event) =>
              setFilters((current) => ({ ...current, from: event.target.value || undefined }))
            }
          />
        </div>
        <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
          <Field
            label="Hasta"
            type="date"
            value={filters.to ?? ""}
            min={filters.from}
            error={rangeError}
            onChange={(event) =>
              setFilters((current) => ({ ...current, to: event.target.value || undefined }))
            }
          />
        </div>
        {filtered && (
          <Button variant="secondary" onClick={() => setFilters({})}>
            Limpiar filtro
          </Button>
        )}
      </div>

      {state.status === "loading" && <LoadingState />}
      {state.status === "error" && <ErrorState onRetry={reload} />}
      {state.status === "ready" && (
        <>
          <div role="tablist" aria-label="Historial" className="flex flex-wrap gap-2">
            {TABS.map((item) => {
              const count = countOf(item.type);
              const selected = item.type === current && count > 0;
              return (
                <button
                  key={item.type}
                  id={tabId(item.type)}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={panelId(item.type)}
                  tabIndex={selected ? 0 : -1}
                  disabled={count === 0}
                  onClick={() => setTab(item.type)}
                  onKeyDown={handleTabKey}
                  className={cn(
                    "min-h-11 rounded-control border px-4 font-semibold transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50",
                    selected
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-field-border bg-surface text-ink enabled:hover:bg-brand-50",
                  )}
                >
                  {item.label} ({count})
                </button>
              );
            })}
          </div>
          {visible.length === 0 ? (
            <p className="text-muted">No hay registros entre esas fechas.</p>
          ) : (
            <ol
              id={panelId(current)}
              role="tabpanel"
              aria-labelledby={tabId(current)}
              className="flex flex-col gap-3"
            >
              {visible.map((entry) => (
                <li
                  key={entry.kind === "CONSULTATION" ? entry.consultation.id : entry.vaccination.id}
                >
                  <HistoryEntry entry={entry} vaccineStatus={statusOf(entry)} />
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
