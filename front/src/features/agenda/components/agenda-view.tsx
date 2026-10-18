"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { ErrorState } from "@/components/ui/error-state";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { AgendaItem } from "@/features/agenda/components/agenda-item";
import { AppointmentDetail } from "@/features/agenda/components/appointment-detail";
import { NewAppointmentDialog } from "@/features/agenda/components/new-appointment-dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { ownerFullName } from "@/features/owners/labels";
import { addDays, clinicDateOf, dayParts, formatLongDate, startOfWeek } from "@/lib/clinic-time";
import {
  APPOINTMENTS_CHANGED_EVENT,
  getAgenda,
  listProfessionals,
  type AgendaParams,
} from "@/services/appointments";
import type { Appointment, Professional } from "@/types/domain";

type View = "day" | "week";
type Kind = "VET" | "GROOMER";

const ALL = "ALL";
const DAYS_IN_WEEK = 7;
const VIEWS: { value: View; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
];

type Staff = { veterinarians: Professional[]; groomers: Professional[] };

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

// El filtro guarda el tipo junto al id porque la API pide veterinarianId o groomerId.
const filterValue = (kind: Kind, id: string) => `${kind}:${id}`;

function filterParams(filter: string): Pick<AgendaParams, "veterinarianId" | "groomerId"> {
  const [kind, id] = filter.split(":");
  if (kind === "VET" && id) return { veterinarianId: id };
  if (kind === "GROOMER" && id) return { groomerId: id };
  return {};
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const dayMonthFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
});
const dayMonth = (date: string) => dayMonthFormatter.format(new Date(`${date}T12:00:00Z`));

export function AgendaView() {
  const { user } = useAuth();
  const isReception = user?.role === "RECEPTIONIST";
  const today = useMemo(() => clinicDateOf(new Date()), []);
  const [view, setView] = useState<View>("day");
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState(ALL);
  const [staff, setStaff] = useState<Load<Staff>>({ status: "loading" });
  const [agenda, setAgenda] = useState<Load<Appointment[]>>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [creating, setCreating] = useState(false);
  const { show } = useToast();

  const from = view === "day" ? date : startOfWeek(date);
  const to = view === "day" ? date : addDays(from, DAYS_IN_WEEK - 1);

  useEffect(() => {
    if (!isReception) return;
    let active = true;
    Promise.all([listProfessionals("GENERAL_CONSULTATION"), listProfessionals("GROOMING")])
      .then(([veterinarians, groomers]) => {
        if (active) setStaff({ status: "ready", data: { veterinarians, groomers } });
      })
      .catch(() => {
        if (active) setStaff({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [isReception, reloadKey]);

  useEffect(() => {
    let active = true;
    setAgenda({ status: "loading" });
    getAgenda({ from, ...(from !== to && { to }), ...filterParams(filter) })
      .then((data) => {
        if (active) setAgenda({ status: "ready", data });
      })
      .catch(() => {
        if (active) setAgenda({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [from, to, filter, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Crear, registrar llegada, No asistió o reasignar cambian la agenda en pantalla.
  useEffect(() => {
    window.addEventListener(APPOINTMENTS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(APPOINTMENTS_CHANGED_EVENT, reload);
  }, [reload]);

  function handleChanged(updated: Appointment, message: string) {
    setSelected((current) => ({ ...updated, owner: updated.owner ?? current?.owner }));
    show(message, "success");
  }

  const professionals = staff.status === "ready" ? staff.data : null;
  const firstProfessional = professionals?.veterinarians[0]
    ? filterValue("VET", professionals.veterinarians[0].id)
    : professionals?.groomers[0]
      ? filterValue("GROOMER", professionals.groomers[0].id)
      : ALL;

  // La semana es de un solo profesional; "Todos" solo existe en la vista diaria.
  function changeView(next: View) {
    setView(next);
    if (next === "week" && isReception && filter === ALL) setFilter(firstProfessional);
  }

  function move(direction: 1 | -1) {
    setDate((current) => addDays(current, direction * (view === "day" ? 1 : DAYS_IN_WEEK)));
  }

  const unit = view === "day" ? "Día" : "Semana";
  const heading =
    view === "day"
      ? capitalize(formatLongDate(date))
      : `Semana del ${dayMonth(from)} al ${dayMonth(to)}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Vista" className="flex gap-2">
            {VIEWS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={item.value === view}
                onClick={() => changeView(item.value)}
                className={cn(
                  "min-h-11 rounded-control border px-4 font-semibold transition-colors duration-150 ease-out",
                  item.value === view
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-field-border bg-surface text-ink hover:bg-brand-50",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="px-3"
              aria-label={`${unit} anterior`}
              onClick={() => move(-1)}
            >
              <Icon name="chevron-right" className="size-5 rotate-180" />
            </Button>
            <Button variant="secondary" onClick={() => setDate(today)}>
              Hoy
            </Button>
            <Button
              variant="secondary"
              className="px-3"
              aria-label={`${unit} siguiente`}
              onClick={() => move(1)}
            >
              <Icon name="chevron-right" className="size-5" />
            </Button>
          </div>
        </div>
        {isReception && (
          <Button onClick={() => setCreating(true)}>
            <Icon name="calendar-plus" className="size-5" />
            Nueva cita
          </Button>
        )}
        {isReception && professionals && (
          <div className="w-full sm:w-72">
            <Select label="Profesional" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {view === "day" && <option value={ALL}>Todos los profesionales</option>}
              <optgroup label="Veterinarios">
                {professionals.veterinarians.map((item) => (
                  <option key={item.id} value={filterValue("VET", item.id)}>
                    {ownerFullName(item)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Estilistas">
                {professionals.groomers.map((item) => (
                  <option key={item.id} value={filterValue("GROOMER", item.id)}>
                    {ownerFullName(item)}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>
        )}
      </div>

      <h2 aria-live="polite" className="text-xl font-semibold text-ink">
        {heading}
      </h2>

      {(agenda.status === "loading" || (isReception && staff.status === "loading")) && (
        <LoadingState />
      )}
      {(agenda.status === "error" || staff.status === "error") && <ErrorState onRetry={reload} />}
      {agenda.status === "ready" && (!isReception || professionals) && (
        <>
          {view === "day" ? (
            <DayView
              appointments={agenda.data}
              groups={isReception && filter === ALL ? professionals : null}
              onOpen={setSelected}
            />
          ) : (
            <WeekView from={from} appointments={agenda.data} onOpen={setSelected} />
          )}
        </>
      )}

      <AppointmentDetail
        appointment={selected}
        canManage={isReception}
        canAttend={user?.role === "VETERINARIAN"}
        onClose={() => setSelected(null)}
        onChanged={handleChanged}
      />
      {isReception && <NewAppointmentDialog open={creating} onClose={() => setCreating(false)} />}
    </div>
  );
}

type ListProps = { appointments: Appointment[]; onOpen: (appointment: Appointment) => void };

function AppointmentList({ appointments, onOpen }: ListProps) {
  if (appointments.length === 0) return <p className="text-muted">Sin citas.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {appointments.map((item) => (
        <li key={item.id}>
          <AgendaItem appointment={item} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

// Con "Todos", recepción ve una columna por profesional (RF-16).
function DayView({ appointments, groups, onOpen }: ListProps & { groups: Staff | null }) {
  if (!groups) return <AppointmentList appointments={appointments} onOpen={onOpen} />;
  const listed = [...groups.veterinarians, ...groups.groomers];
  const unlisted = appointments
    .map((item) => item.professional)
    .filter((pro, index, all) => all.findIndex((other) => other.id === pro.id) === index)
    .filter((pro) => !listed.some((item) => item.id === pro.id));
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[...listed, ...unlisted].map((professional) => (
        <section
          key={professional.id}
          aria-label={ownerFullName(professional)}
          className="flex flex-col gap-3 rounded-card border border-line bg-canvas p-4"
        >
          <h3 className="font-semibold text-ink">{ownerFullName(professional)}</h3>
          <AppointmentList
            appointments={appointments.filter((item) => item.professional.id === professional.id)}
            onOpen={onOpen}
          />
        </section>
      ))}
    </div>
  );
}

function WeekView({ from, appointments, onOpen }: ListProps & { from: string }) {
  const days = Array.from({ length: DAYS_IN_WEEK }, (_, index) => addDays(from, index));
  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => {
        const parts = dayParts(day);
        const dayAppointments = appointments.filter(
          (item) => clinicDateOf(new Date(item.startsAt)) === day,
        );
        return (
          <section
            key={day}
            aria-label={formatLongDate(day)}
            className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-canvas p-3"
          >
            <h3 className="flex items-baseline gap-1 font-semibold text-ink">
              <span className="capitalize">{parts.weekday}</span>
              <span>{parts.day}</span>
            </h3>
            {dayAppointments.length === 0 ? (
              <p className="text-sm text-muted">Sin citas.</p>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
                {dayAppointments.map((item) => (
                  <li key={item.id}>
                    <AgendaItem appointment={item} onOpen={onOpen} compact />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
