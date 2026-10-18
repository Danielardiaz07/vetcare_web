import {
  addDays,
  bookableDates,
  clinicDateOf,
  clinicInstant,
  isChangeable,
  isSunday,
} from "@/lib/clinic-time";
import { MAX_ACTIVE_APPOINTMENTS_PER_PATIENT, MIN_APPOINTMENT_LEAD_HOURS } from "@/lib/constants";
import { getMe } from "@/services/auth";
import { request } from "@/services/http-client";
import { isMockEnabled, isNewAccount, mockError, mockResponse } from "@/services/mocks";
import {
  mockAppointmentTypes,
  mockClinicPatients,
  mockGroomers,
  mockOwners,
  mockPatients,
  mockVeterinarians,
} from "@/services/mocks/fixtures";
import type { Paginated } from "@/types/api";
import type {
  Appointment,
  AppointmentType,
  Availability,
  AvailableSlot,
  Patient,
  Professional,
  StaffProfile,
} from "@/types/domain";

const NOT_FOUND = 404;
const CONFLICT = 409;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const SUGGESTED_DATES = 3;
const PAGE_SIZE = 10;
// El máximo que acepta la API por página (MAX_PAGE_SIZE).
const MAX_PAGE_SIZE = 100;
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

type MockSeed = {
  petIndex: number;
  // Por defecto, el primer veterinario o estilista de los datos de prueba.
  professionalIndex?: number;
  type: AppointmentType;
  status: Appointment["status"];
  // Día y hora de la clínica, o minutos desde ahora para la cita que ya no se puede cambiar.
  when: { daysFromToday: number; time: string } | { minutesFromNow: number };
  reason?: string;
  cancelReason?: string;
};

// Citas de prueba de Laura: una por estado, para ver cada color en Mis citas.
const MOCK_SEEDS: MockSeed[] = [
  {
    petIndex: 0,
    type: "VACCINATION",
    status: "CONFIRMED",
    when: { daysFromToday: 3, time: "10:00" },
  },
  { petIndex: 1, type: "GROOMING", status: "SCHEDULED", when: { daysFromToday: 5, time: "09:00" } },
  // RN-28: a menos de 2 horas ya no se puede reprogramar ni cancelar.
  { petIndex: 1, type: "CHECKUP", status: "SCHEDULED", when: { minutesFromNow: 60 } },
  {
    petIndex: 0,
    type: "GROOMING",
    status: "CANCELLED",
    when: { daysFromToday: 7, time: "11:00" },
    cancelReason: "Viaje familiar",
  },
  {
    petIndex: 0,
    type: "GENERAL_CONSULTATION",
    status: "ATTENDED",
    when: { daysFromToday: -20, time: "08:30" },
    reason: "Se rasca mucho las orejas",
  },
  {
    petIndex: 1,
    type: "CHECKUP",
    status: "NO_SHOW",
    when: { daysFromToday: -40, time: "15:00" },
  },
];

// Citas de otros propietarios, para que la agenda del panel tenga movimiento esta semana.
const CLINIC_SEEDS: MockSeed[] = (
  [
    [0, 0, "GENERAL_CONSULTATION", "ATTENDED", 0, "08:00"],
    [1, 0, "VACCINATION", "CONFIRMED", 0, "11:00"],
    [2, 1, "CHECKUP", "SCHEDULED", 0, "09:30"],
    [0, 0, "GROOMING", "SCHEDULED", 0, "14:00"],
    [3, 1, "GENERAL_CONSULTATION", "SCHEDULED", 0, "15:00"],
    [2, 0, "VACCINATION", "SCHEDULED", 1, "08:30"],
    [1, 0, "GROOMING", "SCHEDULED", 1, "10:00"],
    [3, 0, "CHECKUP", "SCHEDULED", 2, "14:30"],
    [0, 1, "CHECKUP", "SCHEDULED", 2, "11:00"],
    [1, 0, "GENERAL_CONSULTATION", "SCHEDULED", 4, "09:00"],
    [2, 0, "GROOMING", "SCHEDULED", 4, "09:00"],
    [0, 0, "VACCINATION", "NO_SHOW", -1, "10:00"],
  ] as const
).map(([petIndex, professionalIndex, type, status, daysFromToday, time]) => ({
  petIndex,
  professionalIndex,
  type,
  status,
  when: { daysFromToday, time },
}));

function seedStart(when: MockSeed["when"], today: string): string {
  if ("minutesFromNow" in when) {
    return new Date(Date.now() + when.minutesFromNow * MS_PER_MINUTE).toISOString();
  }
  return clinicInstant(workingDay(addDays(today, when.daysFromToday)), when.time);
}

// Corre al lunes siguiente si la fecha cae en domingo, cuando la clínica no atiende.
const workingDay = (date: string) => (isSunday(date) ? addDays(date, 1) : date);

function buildSeeds(seeds: MockSeed[], pets: Patient[], idPrefix: string): Appointment[] {
  const today = clinicDateOf(new Date());
  return seeds.flatMap((seed, index) => {
    const pet = pets[seed.petIndex];
    const professionals = isGrooming(seed.type) ? mockGroomers : mockVeterinarians;
    const professional = professionals[seed.professionalIndex ?? 0];
    const durationMinutes =
      mockAppointmentTypes.find((setting) => setting.type === seed.type)?.durationMinutes ?? 0;
    if (!pet || !professional) return [];
    const startsAt = seedStart(seed.when, today);
    return [
      {
        id: `${idPrefix}${String(index).padStart(2, "0")}`,
        type: seed.type,
        status: seed.status,
        startsAt,
        endsAt: new Date(
          new Date(startsAt).getTime() + durationMinutes * MS_PER_MINUTE,
        ).toISOString(),
        reason: seed.reason ?? null,
        cancelReason: seed.cancelReason ?? null,
        patient: { id: pet.id, name: pet.name },
        professional: {
          id: professional.id,
          firstNames: professional.firstNames,
          lastNames: professional.lastNames,
        },
      },
    ];
  });
}

const isOwnPet = (patientId: string) => mockPatients.some((pet) => pet.id === patientId);

function seedAppointments(): Appointment[] {
  const otherPets = mockClinicPatients.filter((pet) => pet.active && !isOwnPet(pet.id));
  return [
    ...(isNewAccount
      ? []
      : buildSeeds(MOCK_SEEDS, mockPatients, "5b6c7d8e-9f0a-4b1c-8d2e-3f4a5b6c7d")),
    ...buildSeeds(CLINIC_SEEDS, otherPets, "6c7d8e9f-0a1b-4c2d-8e3f-4a5b6c7d8e"),
  ];
}

// Las citas de prueba viven mientras la pestaña está abierta.
const mockAppointmentStore: Appointment[] = isMockEnabled ? seedAppointments() : [];
mockAppointmentStore
  .filter((item) => item.status === "SCHEDULED" || item.status === "CONFIRMED")
  .forEach((item) => mockTakenSlots.add(takenKey(item.professional.id, item.startsAt)));

const mockNotFound = () => mockError(NOT_FOUND, "NOT_FOUND", "Cita no encontrada");

// La primera vez que alguien confirma las 16:00, otra persona "ya la tomó".
function simulateRace(professionals: Professional[], startsAt: string) {
  if (startsAt !== clinicInstant(clinicDateOf(new Date(startsAt)), MOCK_RACE_TIME)) return;
  professionals.forEach((item) => mockTakenSlots.add(takenKey(item.id, startsAt)));
}

const CONTACT_CLINIC_MESSAGE = "Comunícate con la clínica";

// RN-28: como la API, el propietario solo cambia citas activas con más de 2 horas de anticipación.
async function mockModifiable(id: string): Promise<Appointment> {
  const appointment = mockAppointmentStore.find((item) => item.id === id);
  if (!appointment) return mockNotFound();
  if (appointment.status !== "SCHEDULED" && appointment.status !== "CONFIRMED") {
    return mockError(CONFLICT, "CONFLICT", "La cita ya no admite cambios");
  }
  if (!isChangeable(appointment.startsAt)) {
    return mockError(CONFLICT, "CONFLICT", CONTACT_CLINIC_MESSAGE);
  }
  return appointment;
}

async function mockReschedule(id: string, input: RescheduleAppointmentInput): Promise<Appointment> {
  const appointment = await mockModifiable(id);
  const professionals = await listProfessionals(appointment.type);
  simulateRace(professionals, input.startsAt);
  const professionalId = input.professionalId ?? appointment.professional.id;
  if (isTaken(professionalId, input.startsAt)) {
    return mockError(CONFLICT, "CONFLICT", SLOT_TAKEN_MESSAGE);
  }
  const duration =
    new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime();
  mockTakenSlots.delete(takenKey(appointment.professional.id, appointment.startsAt));
  mockTakenSlots.add(takenKey(professionalId, input.startsAt));
  Object.assign(appointment, {
    startsAt: input.startsAt,
    endsAt: new Date(new Date(input.startsAt).getTime() + duration).toISOString(),
  });
  return mockResponse(appointment);
}

async function mockCancel(id: string, reason: string): Promise<Appointment> {
  const appointment = await mockModifiable(id);
  mockTakenSlots.delete(takenKey(appointment.professional.id, appointment.startsAt));
  Object.assign(appointment, { status: "CANCELLED", cancelReason: reason });
  return mockResponse(appointment);
}

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
  simulateRace(all, input.startsAt);
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

// El menú del portal escucha este evento para actualizar el número de citas próximas.
export const APPOINTMENTS_CHANGED_EVENT = "vetcare:appointments-changed";

function notifyChange(appointment: Appointment): Appointment {
  window.dispatchEvent(new Event(APPOINTMENTS_CHANGED_EVENT));
  return appointment;
}

export function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const created = isMockEnabled
    ? mockCreate(input)
    : request<Appointment>("/appointments", { method: "POST", body: input });
  return created.then(notifyChange);
}

// RN-28: el propietario reprograma o cancela hasta 2 horas antes.
export function rescheduleAppointment(
  id: string,
  input: RescheduleAppointmentInput,
): Promise<Appointment> {
  const updated = isMockEnabled
    ? mockReschedule(id, input)
    : request<Appointment>(`/appointments/${id}/reschedule`, { method: "PUT", body: input });
  return updated.then(notifyChange);
}

export function cancelAppointment(id: string, reason: string): Promise<Appointment> {
  const updated = isMockEnabled
    ? mockCancel(id, reason)
    : request<Appointment>(`/appointments/${id}/cancel`, { method: "PUT", body: { reason } });
  return updated.then(notifyChange);
}

// Como la API: próximas son las programadas o confirmadas desde ahora; el resto son anteriores.
export function getMyAppointments(
  when: AppointmentsWhen,
  page = 1,
  limit = PAGE_SIZE,
): Promise<Paginated<Appointment>> {
  if (isMockEnabled) {
    const now = new Date().toISOString();
    const upcoming = (item: Appointment) =>
      (item.status === "SCHEDULED" || item.status === "CONFIRMED") && item.startsAt >= now;
    const matches = mockAppointmentStore
      .filter((item) => isOwnPet(item.patient.id))
      .filter((item) => (when === "upcoming" ? upcoming(item) : !upcoming(item)))
      .sort((a, b) =>
        when === "upcoming"
          ? a.startsAt.localeCompare(b.startsAt)
          : b.startsAt.localeCompare(a.startsAt),
      );
    const total = matches.length;
    return mockResponse({
      data: matches.slice((page - 1) * limit, page * limit),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }
  return request<Paginated<Appointment>>("/me/appointments", { query: { when, page, limit } });
}

// La API no filtra por mascota, así que Mis citas trae todas las páginas y filtra aquí.
export async function getAllMyAppointments(when: AppointmentsWhen): Promise<Appointment[]> {
  const first = await getMyAppointments(when, 1, MAX_PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: Math.max(first.meta.totalPages - 1, 0) }, (_, index) =>
      getMyAppointments(when, index + 2, MAX_PAGE_SIZE),
    ),
  );
  return [first, ...rest].flatMap((result) => result.data);
}

export interface AgendaParams {
  // AAAA-MM-DD de la clínica; la API admite hasta 7 días por consulta.
  from: string;
  to?: string;
  veterinarianId?: string;
  groomerId?: string;
}

function mockOwnerOf(patientId: string): Appointment["owner"] {
  const pet = mockClinicPatients.find((item) => item.id === patientId);
  const owner = mockOwners.find((item) => item.id === pet?.ownerId);
  if (!owner) return undefined;
  const { id, firstNames, lastNames, phone } = owner;
  return { id, firstNames, lastNames, phone };
}

// Como la API: el veterinario y el estilista solo reciben su propia agenda.
async function mockAgenda({ from, to, veterinarianId, groomerId }: AgendaParams) {
  const me = await getMe();
  const ownProfile =
    me.role === "VETERINARIAN"
      ? mockVeterinarians.find((item) => item.userId === me.id)
      : me.role === "GROOMER"
        ? mockGroomers.find((item) => item.userId === me.id)
        : undefined;
  const professionalId = ownProfile?.id ?? veterinarianId ?? groomerId;
  const last = to ?? from;
  const appointments = mockAppointmentStore
    .filter((item) => {
      const date = clinicDateOf(new Date(item.startsAt));
      return date >= from && date <= last;
    })
    .filter((item) => !professionalId || item.professional.id === professionalId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((item) => ({ ...item, owner: mockOwnerOf(item.patient.id) }));
  return mockResponse(appointments);
}

// RF-16: recepción ve toda la agenda; el veterinario y el estilista, solo la suya.
export function getAgenda(params: AgendaParams): Promise<Appointment[]> {
  if (isMockEnabled) return mockAgenda(params);
  return request<Appointment[]>("/appointments", { query: { ...params } });
}
