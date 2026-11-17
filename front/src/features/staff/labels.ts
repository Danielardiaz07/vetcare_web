import type { StaffKind } from "@/services/staff";
import type { AppointmentType } from "@/types/domain";

type KindLabels = { tab: string; singular: string; create: string; noAccounts: string };

export const STAFF_KIND_LABELS: Record<StaffKind, KindLabels> = {
  veterinarians: {
    tab: "Veterinarios",
    singular: "veterinario",
    create: "Nuevo veterinario",
    noAccounts: "No hay cuentas de veterinario sin perfil.",
  },
  groomers: {
    tab: "Estilistas",
    singular: "estilista",
    create: "Nuevo estilista",
    noAccounts: "No hay cuentas de estilista sin perfil.",
  },
};

export const STAFF_KINDS = ["veterinarians", "groomers"] as const satisfies readonly StaffKind[];

export const WEEKDAY_LABELS: Record<(typeof WEEKDAYS)[number], string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  GENERAL_CONSULTATION: "Consulta general",
  VACCINATION: "Vacunación",
  CHECKUP: "Control",
  GROOMING: "Estética",
};

// D-21: franjas de 30 minutos; una duración va de 30 a 180.
export const SLOT_MINUTES = 30;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MAX_DURATION_MINUTES = 180;

const pad = (value: number) => String(value).padStart(2, "0");

// La API acepta horas de 00:00 a 23:30.
export const TIME_OPTIONS = Array.from(
  { length: (HOURS_PER_DAY * MINUTES_PER_HOUR) / SLOT_MINUTES },
  (_, index) => {
    const minutes = index * SLOT_MINUTES;
    return `${pad(Math.floor(minutes / MINUTES_PER_HOUR))}:${pad(minutes % MINUTES_PER_HOUR)}`;
  },
);

export const DURATION_OPTIONS = Array.from(
  { length: MAX_DURATION_MINUTES / SLOT_MINUTES },
  (_, index) => (index + 1) * SLOT_MINUTES,
);

export function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
