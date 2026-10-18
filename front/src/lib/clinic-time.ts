import {
  CLINIC_TIME_ZONE,
  MAX_APPOINTMENT_ADVANCE_DAYS,
  MIN_APPOINTMENT_LEAD_HOURS,
} from "@/lib/constants";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
// D-26: Colombia no cambia de horario, siempre es UTC−5.
const CLINIC_UTC_OFFSET = "-05:00";
const SUNDAY = 0;

// en-CA escribe las fechas como AAAA-MM-DD, el formato de la API.
const clinicDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLINIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: CLINIC_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

const longDateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const weekdayFormatter = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", month: "short" });

// Una fecha AAAA-MM-DD al mediodía UTC cae el mismo día en cualquier zona.
const dateAtNoon = (date: string) => new Date(`${date}T12:00:00Z`);

export const clinicDateOf = (instant: Date) => clinicDateFormatter.format(instant);

export const addDays = (date: string, days: number) =>
  new Date(dateAtNoon(date).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);

export const isSunday = (date: string) => dateAtNoon(date).getUTCDay() === SUNDAY;

// La hora de la clínica de ese día como instante (lo que espera la API).
export const clinicInstant = (date: string, time: string) =>
  new Date(`${date}T${time}:00${CLINIC_UTC_OFFSET}`).toISOString();

// RN-21 y RN-22: desde ahora más 2 horas hasta 30 días adelante.
export function bookableDates(now: Date = new Date()): string[] {
  const first = clinicDateOf(new Date(now.getTime() + MIN_APPOINTMENT_LEAD_HOURS * MS_PER_HOUR));
  const last = clinicDateOf(new Date(now.getTime() + MAX_APPOINTMENT_ADVANCE_DAYS * MS_PER_DAY));
  const dates: string[] = [];
  for (let date = first; date <= last; date = addDays(date, 1)) dates.push(date);
  return dates;
}

// RN-28: el propietario reprograma o cancela solo con más de 2 horas de anticipación.
export const isChangeable = (startsAt: string, now: Date = new Date()) =>
  new Date(startsAt).getTime() - now.getTime() > MIN_APPOINTMENT_LEAD_HOURS * MS_PER_HOUR;

export const formatClinicTime = (instant: string) => timeFormatter.format(new Date(instant));

export const formatLongDate = (date: string) => longDateFormatter.format(dateAtNoon(date));

export function dayParts(date: string) {
  const noon = dateAtNoon(date);
  return {
    weekday: weekdayFormatter.format(noon).replace(".", ""),
    day: noon.getUTCDate(),
    month: monthFormatter.format(noon).replace(".", ""),
  };
}
