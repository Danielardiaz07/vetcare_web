import { bookableDates, clinicDateOf, clinicInstant, isSunday } from "@/lib/clinic-time";
import { MAX_ACTIVE_APPOINTMENTS_PER_PATIENT, MIN_APPOINTMENT_LEAD_HOURS } from "@/lib/constants";
import { request } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import {
  mockAppointmentTypes,
  mockGroomers,
  mockPatients,
  mockVeterinarians,
} from "@/services/mocks/fixtures";
import type { Paginated } from "@/types/api";
import type {
  Appointment,
  AppointmentType,
  Availability,
  AvailableSlot,
  Professional,
  StaffProfile,
} from "@/types/domain";

const NOT_FOUND = 404;
const CONFLICT = 409;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const SUGGESTED_DATES = 3;
const PAGE_SIZE = 10;
// La clínica atiende pocos profesionales por tipo; una página los trae todos.
const PROFESSIONALS_LIMIT = 100;

export type AppointmentsWhen = "upcoming" | "past";

export interface AvailabilityParams {
  type: AppointmentType;
  date: string;
  // D-26: sin profesional, la API busca entre todos los del tipo de cita.
  professionalId?: string;
}

export interface CreateAppointmentInput {
  patientId: string;
  type: AppointmentType;
  professionalId?: string;
  startsAt: string;
  reason?: string;
}

export interface RescheduleAppointmentInput {
  startsAt: string;
  professionalId?: string;
}

const isGrooming = (type: AppointmentType) => type === "GROOMING";

export function listProfessionals(type: AppointmentType): Promise<Professional[]> {
  if (isMockEnabled) {
    const profiles = isGrooming(type) ? mockGroomers : mockVeterinarians;
    return mockResponse(
      profiles
        .filter((profile) => profile.active)
        .map(({ id, firstNames, lastNames, specialty }: StaffProfile) => ({
          id,
          firstNames,
          lastNames,
          ...(specialty !== undefined && { specialty }),
        })),
    );
  }
  const path = isGrooming(type) ? "/groomers" : "/veterinarians";
  return request<Paginated<Professional>>(path, {
    query: { page: 1, limit: PROFESSIONALS_LIMIT },
  }).then((result) => result.data);
}

// Datos de prueba: atención de lunes a sábado, de 8:00 a 17:00, con algunas horas ya tomadas.
const MOCK_OPEN_TIME = "08:00";
const MOCK_CLOSE_TIME = "17:00";
const MOCK_SLOT_MINUTES = 30;
const MOCK_BUSY_TIMES = ["09:00", "10:30", "14:00", "15:30"];
// Simula que otra persona toma las 16:00 mientras se confirma (RN-27): sale libre y al confirmar da 409.
const MOCK_RACE_TIME = "16:00";
const SLOT_TAKEN_MESSAGE = "La franja ya no está disponible";

// Franjas ya reservadas en los datos de prueba, por profesional e inicio.
const mockTakenSlots = new Set<string>();
const takenKey = (professionalId: string, startsAt: string) => `${professionalId}|${startsAt}`;
const isTaken = (professionalId: string, startsAt: string) =>
  mockTakenSlots.has(takenKey(professionalId, startsAt));

function mockSlotsOf(
  date: string,
  durationMinutes: number,
  professionals: Professional[],
  now: Date,
): AvailableSlot[] {
  if (isSunday(date) || professionals.length === 0) return [];
  const earliest = now.getTime() + MIN_APPOINTMENT_LEAD_HOURS * MS_PER_HOUR;
  const close = new Date(clinicInstant(date, MOCK_CLOSE_TIME)).getTime();
  const slots: AvailableSlot[] = [];
  for (
    let start = new Date(clinicInstant(date, MOCK_OPEN_TIME)).getTime();
    start + durationMinutes * MS_PER_MINUTE <= close;
    start += MOCK_SLOT_MINUTES * MS_PER_MINUTE
  ) {
    const startsAt = new Date(start).toISOString();
    const busy = MOCK_BUSY_TIMES.some((time) => clinicInstant(date, time) === startsAt);
    const free = professionals.filter((item) => !isTaken(item.id, startsAt));
    if (start < earliest || busy || free.length === 0) continue;
    slots.push({
      startsAt,
      endsAt: new Date(start + durationMinutes * MS_PER_MINUTE).toISOString(),
      professionals: free,
    });
  }
  return slots;
}

async function mockAvailability({
  type,
  date,
  professionalId,
}: AvailabilityParams): Promise<Availability> {
  const durationMinutes =
    mockAppointmentTypes.find((setting) => setting.type === type)?.durationMinutes ?? 0;
  const all = await listProfessionals(type);
  const professionals = professionalId ? all.filter((item) => item.id === professionalId) : all;
  if (professionalId && professionals.length === 0) {
    return mockError(NOT_FOUND, "NOT_FOUND", "Profesional no encontrado");
  }
  const now = new Date();
  const slots = mockSlotsOf(date, durationMinutes, professionals, now);
  const suggestedDates =
    slots.length > 0
      ? []
      : bookableDates(now)
          .filter(
            (day) => day > date && mockSlotsOf(day, durationMinutes, professionals, now).length,
          )
          .slice(0, SUGGESTED_DATES);
  return mockResponse({ date, durationMinutes, slots, suggestedDates });
}

export function getAvailability(params: AvailabilityParams): Promise<Availability> {
  if (isMockEnabled) return mockAvailability(params);
  return request<Availability>("/appointments/availability", { query: { ...params } });
}

// Las citas de prueba viven mientras la pestaña está abierta.
const mockAppointmentStore: Appointment[] = [];

const mockNotFound = () => mockError(NOT_FOUND, "NOT_FOUND", "Cita no encontrada");

const isActiveFuture = (appointment: Appointment, now: string) =>
  (appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED") &&
  appointment.startsAt > now;

async function mockCreate(input: CreateAppointmentInput): Promise<Appointment> {
  const pet = mockPatients.find((item) => item.id === input.patientId);
  if (!pet) return mockNotFound();
  const now = new Date().toISOString();
  const activeCount = mockAppointmentStore.filter(
    (item) => item.patient.id === pet.id && isActiveFuture(item, now),
  ).length;
  if (activeCount >= MAX_ACTIVE_APPOINTMENTS_PER_PATIENT) {
    return mockError(
      CONFLICT,
      "CONFLICT",
      `Esta mascota ya tiene ${MAX_ACTIVE_APPOINTMENTS_PER_PATIENT} citas activas`,
    );
  }
  const all = await listProfessionals(input.type);
  const date = clinicDateOf(new Date(input.startsAt));
  if (input.startsAt === clinicInstant(date, MOCK_RACE_TIME)) {
    all.forEach((item) => mockTakenSlots.add(takenKey(item.id, input.startsAt)));
  }
  const candidates = all.filter(
    (item) =>
      (!input.professionalId || item.id === input.professionalId) &&
      !isTaken(item.id, input.startsAt),
  );
  const professional = candidates[0];
  if (!professional) return mockError(CONFLICT, "CONFLICT", SLOT_TAKEN_MESSAGE);
  mockTakenSlots.add(takenKey(professional.id, input.startsAt));
  const durationMinutes =
    mockAppointmentTypes.find((setting) => setting.type === input.type)?.durationMinutes ?? 0;
  const appointment: Appointment = {
    id: crypto.randomUUID(),
    type: input.type,
    status: "SCHEDULED",
    startsAt: input.startsAt,
    endsAt: new Date(
      new Date(input.startsAt).getTime() + durationMinutes * MS_PER_MINUTE,
    ).toISOString(),
    reason: input.reason ?? null,
    cancelReason: null,
    patient: { id: pet.id, name: pet.name },
    professional,
  };
  mockAppointmentStore.push(appointment);
  return mockResponse(appointment);
}

function mockUpdate(id: string, changes: Partial<Appointment>): Promise<Appointment> {
  const appointment = mockAppointmentStore.find((item) => item.id === id);
  if (!appointment) return mockNotFound();
  Object.assign(appointment, changes);
  return mockResponse(appointment);
}

export function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  if (isMockEnabled) return mockCreate(input);
  return request<Appointment>("/appointments", { method: "POST", body: input });
}

// RN-28: el propietario reprograma o cancela hasta 2 horas antes.
export function rescheduleAppointment(
  id: string,
  input: RescheduleAppointmentInput,
): Promise<Appointment> {
  if (isMockEnabled) return mockUpdate(id, { startsAt: input.startsAt });
  return request<Appointment>(`/appointments/${id}/reschedule`, { method: "PUT", body: input });
}

export function cancelAppointment(id: string, reason: string): Promise<Appointment> {
  if (isMockEnabled) return mockUpdate(id, { status: "CANCELLED", cancelReason: reason });
  return request<Appointment>(`/appointments/${id}/cancel`, {
    method: "PUT",
    body: { reason },
  });
}

export function getMyAppointments(
  when: AppointmentsWhen,
  page = 1,
): Promise<Paginated<Appointment>> {
  if (isMockEnabled) {
    const now = new Date().toISOString();
    const matches = mockAppointmentStore
      .filter((item) => (when === "upcoming" ? item.startsAt >= now : item.startsAt < now))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const total = matches.length;
    return mockResponse({
      data: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      meta: { page, limit: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
    });
  }
  return request<Paginated<Appointment>>("/me/appointments", {
    query: { when, page, limit: PAGE_SIZE },
  });
}
