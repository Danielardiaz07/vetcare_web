import { addDays, clinicDateOf, clinicInstant, isoWeekday } from "@/lib/clinic-time";
import type { Appointment, Professional, ScheduleBlock } from "@/types/domain";

export const AGENDA_SLOT_MINUTES = 30;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const MS_PER_MINUTE = 60 * 1000;
const UNKNOWN_SCHEDULE_START = 8 * MINUTES_PER_HOUR;
const UNKNOWN_SCHEDULE_END = 18 * MINUTES_PER_HOUR;

export type AgendaStaff = {
  veterinarians: Professional[];
  groomers: Professional[];
  schedules: Record<string, ScheduleBlock[] | null>;
};

export type TimelineAppointment = {
  appointment: Appointment;
  row: number;
  span: number;
  lane: number;
};

export const minutesOf = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
};

export const timeOfMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / MINUTES_PER_HOUR)).padStart(2, "0")}:${String(minutes % MINUTES_PER_HOUR).padStart(2, "0")}`;

export function snappedMarkerOffset(
  top: number,
  height: number,
  fraction: number,
  pixelRatio: number,
) {
  const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const pixel = Math.max(Math.ceil(top * ratio), Math.round((top + height * fraction) * ratio));
  return pixel / ratio - top;
}

export function agendaTimePosition(date: string, slots: number[], now: Date | null) {
  if (!now || slots.length === 0 || clinicDateOf(now) !== date) return null;
  const minute = (now.getTime() - new Date(clinicInstant(date, "00:00")).getTime()) / MS_PER_MINUTE;
  const slot = Math.floor(minute / AGENDA_SLOT_MINUTES) * AGENDA_SLOT_MINUTES;
  const index = Math.floor((slot - slots[0]!) / AGENDA_SLOT_MINUTES);
  return {
    slotIndex: Math.max(0, Math.min(index, slots.length - 1)),
    inRange: index >= 0 && index < slots.length,
    fraction: (minute - slot) / AGENDA_SLOT_MINUTES,
    label: timeOfMinutes(Math.floor(minute)),
  };
}

export function dayTimeline(
  date: string,
  appointments: Appointment[],
  staff: AgendaStaff,
  professionalId?: string,
) {
  const dayAppointments = appointments.filter(
    (item) => clinicDateOf(new Date(item.startsAt)) === date,
  );
  const professionals = new Map(
    [
      ...staff.veterinarians.map((professional) => ({ professional, kind: "VET" as const })),
      ...staff.groomers.map((professional) => ({ professional, kind: "GROOMER" as const })),
    ].map((entry) => [entry.professional.id, entry]),
  );
  for (const item of dayAppointments) {
    if (!professionals.has(item.professional.id)) {
      professionals.set(item.professional.id, {
        professional: item.professional,
        kind: item.type === "GROOMING" ? "GROOMER" : "VET",
      });
    }
  }
  const weekday = isoWeekday(date);
  const columns = [...professionals.values()]
    .filter((entry) => !professionalId || entry.professional.id === professionalId)
    .map((entry) => {
      const schedule = staff.schedules[entry.professional.id];
      return {
        ...entry,
        blocks: schedule?.filter((block) => block.weekday === weekday) ?? null,
        appointments: dayAppointments
          .filter((item) => item.professional.id === entry.professional.id)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id)),
      };
    });
  const midnight = new Date(clinicInstant(date, "00:00")).getTime();
  const minuteAt = (instant: string) => (new Date(instant).getTime() - midnight) / MS_PER_MINUTE;
  const ranges = columns.flatMap((column) => [
    ...(column.blocks ?? []).map((block) => ({
      start: minutesOf(block.startTime),
      end: minutesOf(block.endTime),
    })),
    ...column.appointments.map((item) => ({
      start: minuteAt(item.startsAt),
      end: minuteAt(item.endsAt),
    })),
  ]);
  const unknownSchedule = columns.some((column) => column.blocks === null);
  const firstMinute = ranges.length
    ? Math.min(...ranges.map((range) => range.start))
    : UNKNOWN_SCHEDULE_START;
  const lastMinute = ranges.length
    ? Math.max(...ranges.map((range) => range.end))
    : UNKNOWN_SCHEDULE_END;
  const start = Math.max(0, Math.floor(firstMinute / AGENDA_SLOT_MINUTES) * AGENDA_SLOT_MINUTES);
  const end = Math.min(
    MINUTES_PER_DAY,
    Math.ceil(lastMinute / AGENDA_SLOT_MINUTES) * AGENDA_SLOT_MINUTES,
  );
  const slots =
    ranges.length || unknownSchedule
      ? Array.from(
          { length: Math.max(0, (end - start) / AGENDA_SLOT_MINUTES) },
          (_, index) => start + index * AGENDA_SLOT_MINUTES,
        )
      : [];

  return {
    slots,
    columns: columns.map((column) => {
      const laneEnds: number[] = [];
      const entries: TimelineAppointment[] = column.appointments.map((appointment) => {
        const begins = minuteAt(appointment.startsAt);
        const finishes = minuteAt(appointment.endsAt);
        let lane = laneEnds.findIndex((lastEnd) => lastEnd <= begins);
        if (lane < 0) lane = laneEnds.length;
        laneEnds[lane] = finishes;
        const firstRow = Math.floor((begins - start) / AGENDA_SLOT_MINUTES);
        return {
          appointment,
          lane,
          row: firstRow + 1,
          span: Math.max(1, Math.ceil((finishes - start) / AGENDA_SLOT_MINUTES) - firstRow),
        };
      });
      return {
        ...column,
        key: column.professional.id,
        date,
        entries,
        lanes: Math.max(1, laneEnds.length),
      };
    }),
  };
}

export function weekTimeline(
  from: string,
  appointments: Appointment[],
  staff: AgendaStaff,
  professionalId: string,
) {
  const existing = appointments.find((item) => item.professional.id === professionalId);
  const known = [...staff.veterinarians, ...staff.groomers].some(
    (item) => item.id === professionalId,
  );
  const people =
    existing && !known
      ? {
          ...staff,
          veterinarians:
            existing.type === "GROOMING"
              ? staff.veterinarians
              : [...staff.veterinarians, existing.professional],
          groomers:
            existing.type === "GROOMING"
              ? [...staff.groomers, existing.professional]
              : staff.groomers,
        }
      : staff;
  const days = Array.from({ length: 7 }, (_, index) =>
    dayTimeline(addDays(from, index), appointments, people, professionalId),
  );
  const occupiedSlots = days.flatMap((day) => day.slots);
  const start = occupiedSlots.length ? Math.min(...occupiedSlots) : 0;
  const end = occupiedSlots.length ? Math.max(...occupiedSlots) + AGENDA_SLOT_MINUTES : 0;
  return {
    slots: Array.from(
      { length: (end - start) / AGENDA_SLOT_MINUTES },
      (_, index) => start + index * AGENDA_SLOT_MINUTES,
    ),
    columns: days.flatMap((day) =>
      day.columns.map((column) => ({
        ...column,
        key: column.date,
        entries: column.entries.map((entry) => ({
          ...entry,
          row: entry.row + ((day.slots[0] ?? start) - start) / AGENDA_SLOT_MINUTES,
        })),
      })),
    ),
  };
}

export function agendaColumnPages(
  columns: ReturnType<typeof dayTimeline>["columns"],
  capacity: number,
) {
  const limit = Math.max(1, Math.floor(capacity));
  const entries = columns.flatMap((column) => {
    if (column.lanes <= limit) {
      return [{ ...column, laneLabel: "" }];
    }
    return Array.from({ length: column.lanes }, (_, lane) => ({
      ...column,
      key: `${column.key}:${lane}`,
      laneLabel: `Coincidencia ${lane + 1} de ${column.lanes}`,
      lanes: 1,
      entries: column.entries
        .filter((entry) => entry.lane === lane)
        .map((entry) => ({ ...entry, lane: 0 })),
    }));
  });
  const pages: (typeof entries)[] = [];
  let used = 0;
  for (const column of entries) {
    if (!pages.length || used + column.lanes > limit) {
      pages.push([]);
      used = 0;
    }
    pages.at(-1)!.push(column);
    used += column.lanes;
  }
  return pages;
}
