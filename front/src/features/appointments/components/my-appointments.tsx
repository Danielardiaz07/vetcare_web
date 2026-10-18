"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { ROUTES } from "@/lib/constants";
import { getAllMyAppointments, type AppointmentsWhen } from "@/services/appointments";
import { getMyPatients } from "@/services/patients";
import type { Appointment, Patient } from "@/types/domain";

const ALL_PETS = "all";
const PAGE_SIZE = 10;
const TABS: { when: AppointmentsWhen; label: string }[] = [
  { when: "upcoming", label: "Próximas" },
  { when: "past", label: "Anteriores" },
];

type AppointmentsData = { pets: Patient[]; upcoming: Appointment[]; past: Appointment[] };

type LoadState =
  { status: "loading" } | { status: "error" } | { status: "ready"; data: AppointmentsData };

const tabId = (when: AppointmentsWhen) => `appointments-tab-${when}`;
const panelId = (when: AppointmentsWhen) => `appointments-panel-${when}`;

async function loadAppointments(): Promise<AppointmentsData> {
  const [pets, upcoming, past] = await Promise.all([
    getMyPatients(),
    getAllMyAppointments("upcoming"),
    getAllMyAppointments("past"),
  ]);
  return { pets, upcoming, past };
}

export function MyAppointments() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [when, setWhen] = useState<AppointmentsWhen>("upcoming");
  const [petId, setPetId] = useState(ALL_PETS);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    loadAppointments()
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  function selectTab(next: AppointmentsWhen) {
    setWhen(next);
    setPage(1);
  }

  // Las flechas mueven entre pestañas, como en un tablist nativo.
  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = TABS.find((tab) => tab.when !== when)?.when ?? when;
    selectTab(next);
    document.getElementById(tabId(next))?.focus();
  }

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState onRetry={reload} />;

  const { pets } = state.data;
  const pet = pets.find((item) => item.id === petId);
  const ofPet = (list: Appointment[]) => list.filter((item) => !pet || item.patient.id === pet.id);
  const matches = ofPet(state.data[when]);
  const totalPages = Math.ceil(matches.length / PAGE_SIZE);
  const visible = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const emptyTitle =
    when === "upcoming"
      ? pet
        ? `${pet.name} no tiene citas próximas`
        : "No tienes citas próximas"
      : pet
        ? `${pet.name} aún no tiene citas anteriores`
        : "Aún no tienes citas anteriores";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div role="tablist" aria-label="Citas" className="flex gap-2">
          {TABS.map((tab) => {
            const selected = tab.when === when;
            return (
              <button
                key={tab.when}
                id={tabId(tab.when)}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={panelId(tab.when)}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(tab.when)}
                onKeyDown={handleTabKey}
                className={cn(
                  "min-h-11 rounded-control border px-4 font-semibold transition-colors duration-150 ease-out",
                  selected
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-field-border bg-surface text-ink hover:bg-brand-50",
                )}
              >
                {tab.label} ({ofPet(state.data[tab.when]).length})
              </button>
            );
          })}
        </div>
        {pets.length > 0 && (
          <div className="w-full sm:w-64">
            <Select
              label="Mostrar"
              value={petId}
              onChange={(event) => {
                setPetId(event.target.value);
                setPage(1);
              }}
            >
              <option value={ALL_PETS}>Todas las mascotas</option>
              {pets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div
        id={panelId(when)}
        role="tabpanel"
        aria-labelledby={tabId(when)}
        className="flex flex-col gap-4"
      >
        {visible.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={
              when === "upcoming"
                ? "Agenda una consulta, una vacuna o un baño y aquí verás la fecha, la hora y cómo prepararte."
                : "Aquí verás las citas atendidas, canceladas o a las que no asistió."
            }
            action={
              when === "upcoming" && (
                <Link
                  href={ROUTES.portalNewAppointment}
                  className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-600 px-5 font-medium text-white transition-colors duration-150 ease-out hover:bg-brand-700"
                >
                  Agendar cita
                </Link>
              )
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((appointment) => (
              <li key={appointment.id}>
                <AppointmentCard appointment={appointment} withPrep={when === "upcoming"} />
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
