"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { DatePicker } from "@/components/ui/date-picker";
import { ErrorState } from "@/components/ui/error-state";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { AgendaItem } from "@/features/agenda/components/agenda-item";
import { AppointmentDetail } from "@/features/agenda/components/appointment-detail";
import { DayAgendaGrid } from "@/features/agenda/components/day-agenda-grid";
import { NewAppointmentDialog } from "@/features/agenda/components/new-appointment-dialog";
import type { AgendaStaff } from "@/features/agenda/timeline";
import { useAuth } from "@/features/auth/auth-provider";
import { ownerFullName } from "@/features/owners/labels";
import { addDays, clinicDateOf, dayParts, formatLongDate, startOfWeek } from "@/lib/clinic-time";
import {
  APPOINTMENTS_CHANGED_EVENT,
  getAgenda,
  listProfessionals,
  type AgendaParams,
} from "@/services/appointments";
import { getSchedule } from "@/services/staff";
import { getMe } from "@/services/auth";
import type { SessionUser, UserProfile } from "@/types/auth";
import type { Appointment } from "@/types/domain";

type View = "list" | "day" | "week";
type Kind = "VET" | "GROOMER";

const ALL = "ALL";
const DAYS_IN_WEEK = 7;
const DATE_CONTROL_CLASS = "h-11 shrink-0 border-line! text-sm hover:bg-canvas!";
const VIEWS: { value: View; label: string }[] = [
  { value: "list", label: "Lista" },
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
];

type Staff = AgendaStaff;

async function loadStaff(): Promise<Staff> {
  const [veterinarians, groomers] = await Promise.all([
    listProfessionals("GENERAL_CONSULTATION"),
    listProfessionals("GROOMING"),
  ]);
  const people = [
    ...veterinarians.map((professional) => ({ professional, kind: "veterinarians" as const })),
    ...groomers.map((professional) => ({ professional, kind: "groomers" as const })),
  ];
  const results = await Promise.allSettled(
    people.map(({ professional, kind }) => getSchedule(kind, professional.id)),
  );
  return {
    veterinarians,
    groomers,
    schedules: Object.fromEntries(
      people.map(({ professional }, index) => {
        const result = results[index]!;
        return [professional.id, result.status === "fulfilled" ? result.value : null];
      }),
    ),
  };
}

async function loadOwnStaff(user: SessionUser, profile: UserProfile | null): Promise<Staff> {
  const me = profile?.id === user.id ? profile : await getMe();
  const isVet = user.role === "VETERINARIAN";
  const professional = isVet ? me.veterinarian : me.groomer;
  if (!professional) throw new Error("No se encontró el perfil profesional");
  const schedule = await getSchedule(isVet ? "veterinarians" : "groomers", professional.id).catch(
    () => null,
  );
  return {
    veterinarians: isVet ? [professional] : [],
    groomers: isVet ? [] : [professional],
    schedules: { [professional.id]: schedule },
  };
}

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

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
  const { user, profile } = useAuth();
  const isReception = user?.role === "RECEPTIONIST";
  const today = useMemo(() => clinicDateOf(new Date()), []);
  const [view, setView] = useState<View>("day");
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState(ALL);
  const [staff, setStaff] = useState<Load<Staff>>({ status: "loading" });
  const [agenda, setAgenda] = useState<Load<Appointment[]>>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [staffReloadKey, setStaffReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const agendaRequestKey = useRef<string | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [creating, setCreating] = useState(false);
  const { show } = useToast();

  const professionals = staff.status === "ready" ? staff.data : null;
  const firstProfessional = professionals?.veterinarians[0]
    ? filterValue("VET", professionals.veterinarians[0].id)
    : professionals?.groomers[0]
      ? filterValue("GROOMER", professionals.groomers[0].id)
      : ALL;

  const activeFilter = view === "week" && filter === ALL ? firstProfessional : filter;

  const from = view === "week" ? startOfWeek(date) : date;
  const to = view === "week" ? addDays(from, DAYS_IN_WEEK - 1) : date;

  useEffect(() => {
    if (!user) return;
    let active = true;
    (isReception ? loadStaff() : loadOwnStaff(user, profile))
      .then((data) => {
        if (active) setStaff({ status: "ready", data });
      })
      .catch(() => {
        if (active) setStaff({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [user, profile, isReception, staffReloadKey]);

  useEffect(() => {
    let active = true;
    const key = `${from}:${to}:${activeFilter}`;
    const sameRange = agendaRequestKey.current === key;
    agendaRequestKey.current = key;
    setAgenda((current) =>
      sameRange && current.status === "ready" ? current : { status: "loading" },
    );
    setRefreshing(true);
    setRefreshError(false);
    getAgenda({ from, ...(from !== to && { to }), ...filterParams(activeFilter) })
      .then((data) => {
        if (active) setAgenda({ status: "ready", data });
      })
      .catch(() => {
        if (!active) return;
        setRefreshError(true);
        setAgenda((current) =>
          sameRange && current.status === "ready" ? current : { status: "error" },
        );
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [from, to, activeFilter, reloadKey]);

  const refreshAgenda = useCallback(() => setReloadKey((key) => key + 1), []);
  const reload = useCallback(() => {
    refreshAgenda();
    setStaffReloadKey((key) => key + 1);
  }, [refreshAgenda]);

  useEffect(() => {
    window.addEventListener(APPOINTMENTS_CHANGED_EVENT, refreshAgenda);
    return () => window.removeEventListener(APPOINTMENTS_CHANGED_EVENT, refreshAgenda);
  }, [refreshAgenda]);

  function handleChanged(updated: Appointment, message: string) {
    setAgenda((current) =>
      current.status === "ready"
        ? {
            status: "ready",
            data: current.data.map((item) =>
              item.id === updated.id ? { ...updated, owner: updated.owner ?? item.owner } : item,
            ),
          }
        : current,
    );
    setSelected((current) =>
      current?.id === updated.id ? { ...updated, owner: updated.owner ?? current.owner } : current,
    );
    show(message, "success");
  }

  function changeView(next: View) {
    setView(next);
    if (next === "week" && isReception && filter === ALL) setFilter(firstProfessional);
  }

  function move(direction: 1 | -1) {
    setDate((current) => addDays(current, direction * (view === "week" ? DAYS_IN_WEEK : 1)));
  }

  const unit = view === "week" ? "Semana" : "Día";
  const heading =
    view !== "week"
      ? capitalize(formatLongDate(date))
      : `Semana del ${dayMonth(from)} al ${dayMonth(to)}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Vista"
            className="inline-flex h-11 shrink-0 rounded-control border border-line bg-surface p-0.5"
          >
            {VIEWS.filter((item) => !isReception || item.value !== "list").map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={item.value === view}
                onClick={() => changeView(item.value)}
                className={cn(
                  "relative rounded-md px-4 text-sm font-semibold transition-colors duration-150 ease-out after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
                  item.value === view
                    ? "bg-brand-100 text-brand-700"
                    : "text-muted hover:bg-canvas hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {isReception && (
            <Button
              className="h-11 shrink-0 px-4! text-sm font-semibold sm:ml-auto"
              onClick={() => setCreating(true)}
            >
              <Icon name="calendar-plus" className="size-5" />
              Nueva cita
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 aria-live="polite" className="text-xl font-semibold text-ink">
              {heading}
            </h2>
            <div
              role="group"
              aria-label="Navegación por fecha"
              className="flex flex-wrap items-center gap-2"
            >
              <DatePicker
                value={date}
                onChange={setDate}
                triggerClassName={cn(DATE_CONTROL_CLASS, "px-3!")}
              />
              <Button
                variant="secondary"
                aria-label={unit + " anterior"}
                onClick={() => move(-1)}
                className={cn(DATE_CONTROL_CLASS, "w-11 px-0!")}
              >
                <Icon name="chevron-right" className="size-5 rotate-180" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDate(today)}
                className={cn(DATE_CONTROL_CLASS, "px-3!")}
              >
                Hoy
              </Button>
              <Button
                variant="secondary"
                aria-label={unit + " siguiente"}
                onClick={() => move(1)}
                className={cn(DATE_CONTROL_CLASS, "w-11 px-0!")}
              >
                <Icon name="chevron-right" className="size-5" />
              </Button>
              <Button
                variant="secondary"
                aria-label="Actualizar agenda"
                title="Actualizar agenda"
                loading={refreshing}
                onClick={reload}
                className={cn(DATE_CONTROL_CLASS, "w-11 px-0!")}
              >
                {!refreshing && <Icon name="refresh" className="size-5" />}
              </Button>
            </div>
          </div>
          {isReception && professionals && (
            <div className="w-full min-w-0 sm:w-72">
              <Select
                label="Profesional"
                className="w-full min-w-0"
                value={activeFilter}
                onChange={(e) => setFilter(e.target.value)}
              >
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
      </div>

      {(agenda.status === "loading" || (view !== "list" && staff.status === "loading")) && (
        <LoadingState />
      )}
      {(agenda.status === "error" || (isReception && staff.status === "error")) && (
        <ErrorState onRetry={reload} />
      )}
      {!isReception && view !== "list" && staff.status === "error" && (
        <p role="alert" className="text-sm text-muted">
          No pudimos cargar tu perfil para mostrar la cuadrícula. Se muestran tus citas en lista;
          pulsa “Actualizar” para reintentar.
        </p>
      )}
      {refreshError && agenda.status === "ready" && (
        <p role="alert" className="text-sm text-danger">
          No pudimos actualizar la agenda. Se conservan las últimas citas cargadas; pulsa
          “Actualizar” para reintentar.
        </p>
      )}
      {agenda.status === "ready" && (view === "list" || staff.status !== "loading") && (
        <>
          {view === "list" ? (
            <AppointmentList appointments={agenda.data} onOpen={setSelected} />
          ) : professionals ? (
            <DayAgendaGrid
              key={`${view}:${from}`}
              date={from}
              weekly={view === "week"}
              appointments={agenda.data}
              staff={professionals}
              professionalId={
                isReception
                  ? (filterParams(activeFilter).veterinarianId ??
                    filterParams(activeFilter).groomerId)
                  : (professionals.veterinarians[0]?.id ?? professionals.groomers[0]?.id)
              }
              canRegisterArrival={isReception}
              onOpen={setSelected}
              onChanged={handleChanged}
            />
          ) : isReception ? null : view === "day" ? (
            <AppointmentList appointments={agenda.data} onOpen={setSelected} />
          ) : (
            <WeekView from={from} appointments={agenda.data} onOpen={setSelected} />
          )}
        </>
      )}

      <AppointmentDetail
        appointment={selected}
        canManage={isReception}
        canAttend={user?.role === "VETERINARIAN" || user?.role === "GROOMER"}
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
