import { addDays, clinicDateOf } from "@/lib/clinic-time";
import { getAgenda, mockAppointmentById } from "@/services/appointments";
import { getMe } from "@/services/auth";
import { request } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import {
  mockConsultations,
  mockVaccinations,
  mockVaccines,
  mockVeterinarians,
} from "@/services/mocks/fixtures";
import { getMyPatient, getPatient } from "@/services/patients";
import type {
  Appointment,
  Consultation,
  HistoryEntry,
  Patient,
  Vaccination,
  VaccinationCardEntry,
  Vaccine,
  VaccineStatus,
} from "@/types/domain";

const FORBIDDEN = 403;
const NOT_FOUND = 404;
const CONFLICT = 409;
const RECENT_CONSULTATIONS = 3;
// RN-49: una vacuna cuya próxima dosis cae en los próximos 7 días está por vencer.
const DUE_SOON_DAYS = 7;

export type HistoryType = "CONSULTATION" | "VACCINATION";

// AAAA-MM-DD; los dos extremos se incluyen.
export interface HistoryFilters {
  from?: string;
  to?: string;
}

export interface ConsultationInput {
  symptoms: string;
  weightKg: number;
  temperatureC: number;
  diagnosis: string;
  treatment: string;
  prescription?: string;
  internalNotes?: string;
  cost: number;
}

export interface VaccinationInput {
  patientId: string;
  vaccineId: string;
  lot: string;
  // AAAA-MM-DD (RN-48).
  appliedAt: string;
  nextDoseAt?: string;
}

// Los cambios de prueba viven mientras la pestaña está abierta.
const mockConsultationStore = structuredClone(mockConsultations);
const mockVaccinationStore = structuredClone(mockVaccinations);

function mockHistory(patientId: string, type?: HistoryType): HistoryEntry[] {
  const consultations: HistoryEntry[] =
    type === "VACCINATION"
      ? []
      : mockConsultationStore
          .filter((item) => item.patientId === patientId)
          .map((consultation) => ({
            kind: "CONSULTATION",
            date: consultation.createdAt,
            consultation,
          }));
  const vaccinations: HistoryEntry[] =
    type === "CONSULTATION"
      ? []
      : mockVaccinationStore
          .filter((item) => item.patientId === patientId)
          .map((vaccination) => ({
            kind: "VACCINATION",
            date: vaccination.appliedAt,
            vaccination,
          }));
  return [...consultations, ...vaccinations].sort((a, b) => b.date.localeCompare(a.date));
}

function vaccineStatus(nextDoseAt: string | null, today: string): VaccineStatus {
  if (!nextDoseAt) return "UP_TO_DATE";
  if (nextDoseAt < today) return "OVERDUE";
  return nextDoseAt <= addDays(today, DUE_SOON_DAYS) ? "DUE_SOON" : "UP_TO_DATE";
}

// D-27 (7): el carné muestra la última dosis de cada vacuna.
function mockVaccinationCard(patientId: string): VaccinationCardEntry[] {
  const today = clinicDateOf(new Date());
  const latest = new Map<string, VaccinationCardEntry>();
  mockVaccinationStore
    .filter((item) => item.patientId === patientId)
    .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt))
    .forEach((item) =>
      latest.set(item.vaccine.id, { ...item, status: vaccineStatus(item.nextDoseAt, today) }),
    );
  return [...latest.values()];
}

// RN-41: del más reciente al más antiguo; el personal también recibe las notas internas.
export function getPatientHistory(patientId: string, type?: HistoryType): Promise<HistoryEntry[]> {
  if (isMockEnabled) return mockResponse(mockHistory(patientId, type));
  return request<HistoryEntry[]>(`/patients/${patientId}/history`, { query: { type } });
}

const entryDate = (entry: HistoryEntry) =>
  entry.kind === "CONSULTATION" ? clinicDateOf(new Date(entry.date)) : entry.date;

async function mockMyHistory(patientId: string, filters: HistoryFilters): Promise<HistoryEntry[]> {
  await getMyPatient(patientId);
  const entries = mockHistory(patientId)
    .filter((entry) => {
      const date = entryDate(entry);
      return (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to);
    })
    // RN-42: el propietario nunca recibe las notas internas.
    .map((entry) =>
      entry.kind === "CONSULTATION"
        ? { ...entry, consultation: { ...entry.consultation, internalNotes: null } }
        : entry,
    );
  return mockResponse(entries);
}

// RN-40: la API solo responde por las mascotas del propietario de la sesión.
export function getMyPatientHistory(
  patientId: string,
  filters: HistoryFilters = {},
): Promise<HistoryEntry[]> {
  if (isMockEnabled) return mockMyHistory(patientId, filters);
  return request<HistoryEntry[]>(`/me/patients/${patientId}/history`, { query: { ...filters } });
}

export function getVaccinationCard(patientId: string): Promise<VaccinationCardEntry[]> {
  if (isMockEnabled) return mockResponse(mockVaccinationCard(patientId));
  return request<VaccinationCardEntry[]>(`/patients/${patientId}/vaccination-card`);
}

export type AttentionContext =
  // RN-44: la agenda del veterinario solo trae sus citas, así que una ajena no aparece.
  | { status: "not-found" }
  // RN-43: solo se atiende una cita Confirmada.
  | { status: "not-confirmed"; appointment: Appointment }
  | {
      status: "ready";
      appointment: Appointment;
      patient: Patient;
      consultations: Consultation[];
      vaccinations: VaccinationCardEntry[];
    };

// La API no tiene GET /appointments/{id}: la cita se busca en la agenda del día que trae el enlace.
export async function getAttentionContext(
  appointmentId: string,
  date: string,
): Promise<AttentionContext> {
  const agenda = await getAgenda({ from: date });
  const appointment = agenda.find((item) => item.id === appointmentId);
  if (!appointment) return { status: "not-found" };
  if (appointment.status !== "CONFIRMED") return { status: "not-confirmed", appointment };

  const [patient, history, vaccinations] = await Promise.all([
    getPatient(appointment.patient.id),
    getPatientHistory(appointment.patient.id, "CONSULTATION"),
    getVaccinationCard(appointment.patient.id),
  ]);
  const consultations = history
    .flatMap((entry) => (entry.kind === "CONSULTATION" ? [entry.consultation] : []))
    .slice(0, RECENT_CONSULTATIONS);
  return { status: "ready", appointment, patient, consultations, vaccinations };
}

async function mockSaveConsultation(
  appointmentId: string,
  input: ConsultationInput,
): Promise<Consultation> {
  const [me, appointment] = [await getMe(), mockAppointmentById(appointmentId)];
  const veterinarian = mockVeterinarians.find((item) => item.userId === me.id);
  if (!appointment || appointment.professional.id !== veterinarian?.id) {
    return mockError(
      FORBIDDEN,
      "FORBIDDEN",
      "Solo el veterinario asignado puede registrar la consulta",
    );
  }
  if (appointment.status !== "CONFIRMED") {
    return mockError(
      CONFLICT,
      "CONFLICT",
      "Solo se registra una consulta sobre una cita confirmada",
    );
  }
  appointment.status = "ATTENDED";
  const consultation: Consultation = {
    ...input,
    id: crypto.randomUUID(),
    appointmentId,
    patientId: appointment.patient.id,
    veterinarian: {
      id: veterinarian.id,
      firstNames: veterinarian.firstNames,
      lastNames: veterinarian.lastNames,
    },
    prescription: input.prescription ?? null,
    internalNotes: input.internalNotes ?? null,
    createdAt: new Date().toISOString(),
  };
  mockConsultationStore.push(consultation);
  return mockResponse(consultation);
}

// RN-46: la API guarda la consulta, pasa la cita a Atendida y actualiza el peso en una transacción.
export function saveConsultation(
  appointmentId: string,
  input: ConsultationInput,
): Promise<Consultation> {
  if (isMockEnabled) return mockSaveConsultation(appointmentId, input);
  return request<Consultation>("/consultations", {
    method: "POST",
    body: { appointmentId, ...input },
  });
}

// El select solo ofrece las vacunas activas del catálogo.
export async function listVaccines(): Promise<Vaccine[]> {
  const vaccines = isMockEnabled
    ? await mockResponse(mockVaccines)
    : await request<Vaccine[]>("/vaccines");
  return vaccines.filter((vaccine) => vaccine.active);
}

async function mockRegisterVaccination(input: VaccinationInput): Promise<Vaccination> {
  const me = await getMe();
  const veterinarian = mockVeterinarians.find((item) => item.userId === me.id);
  const vaccine = mockVaccines.find((item) => item.id === input.vaccineId && item.active);
  if (!veterinarian) return mockError(FORBIDDEN, "FORBIDDEN", "No tienes permiso");
  if (!vaccine) return mockError(NOT_FOUND, "NOT_FOUND", "Vacuna no encontrada");
  const vaccination: Vaccination = {
    id: crypto.randomUUID(),
    patientId: input.patientId,
    vaccine: { id: vaccine.id, name: vaccine.name },
    veterinarian: {
      id: veterinarian.id,
      firstNames: veterinarian.firstNames,
      lastNames: veterinarian.lastNames,
    },
    lot: input.lot,
    appliedAt: input.appliedAt,
    nextDoseAt: input.nextDoseAt ?? null,
    price: vaccine.price,
    createdAt: new Date().toISOString(),
  };
  mockVaccinationStore.push(vaccination);
  return mockResponse(vaccination);
}

// RN-48: la API cobra la vacuna con el precio del catálogo al aplicarla (D-27).
export function registerVaccination(input: VaccinationInput): Promise<Vaccination> {
  if (isMockEnabled) return mockRegisterVaccination(input);
  return request<Vaccination>("/vaccinations", { method: "POST", body: input });
}
