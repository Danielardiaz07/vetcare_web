import { CLINIC_UTC_OFFSET_MINUTES } from "@/config/constants";

// Las fechas de la clínica son "YYYY-MM-DD" en hora local; los instantes se guardan en UTC.
export const CLINIC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const ISO_DATE_LENGTH = 10;
const ISO_SUNDAY = 7;

export const isValidClinicDate = (value: string): boolean =>
  CLINIC_DATE_PATTERN.test(value) &&
  new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, ISO_DATE_LENGTH) === value;

export const clinicDateOf = (instant: Date): string =>
  new Date(instant.getTime() + CLINIC_UTC_OFFSET_MINUTES * MINUTE_MS)
    .toISOString()
    .slice(0, ISO_DATE_LENGTH);

// ISO: 1 = lunes … 7 = domingo, igual que Schedule.weekday.
export function clinicWeekdayOf(date: string): number {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? ISO_SUNDAY : day;
}

export const clinicInstant = (date: string, minutesOfDay: number): Date =>
  new Date(
    new Date(`${date}T00:00:00.000Z`).getTime() +
      (minutesOfDay - CLINIC_UTC_OFFSET_MINUTES) * MINUTE_MS,
  );

export const addDays = (date: string, days: number): string =>
  new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, ISO_DATE_LENGTH);

export const daysBetween = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T00:00:00.000Z`).getTime() - new Date(`${from}T00:00:00.000Z`).getTime()) /
      DAY_MS,
  );

export const addMinutes = (instant: Date, minutes: number): Date =>
  new Date(instant.getTime() + minutes * MINUTE_MS);

export const minutesBetween = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / MINUTE_MS);
