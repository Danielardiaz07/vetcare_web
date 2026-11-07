import { addDays, clinicDateOf } from "@/lib/clinic-time";
import { getAgenda, mockAppointmentById } from "@/services/appointments";
import { getMe } from "@/services/auth";
import { request } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import {
  mockConsultations,
  mockHospitalizations,
  mockLabExams,
  mockSurgeries,
  mockVaccinations,
  mockVaccines,
  mockVeterinarians,
} from "@/services/mocks/fixtures";
import { getMyPatient, getPatient } from "@/services/patients";
import type { Paginated } from "@/types/api";
import type {
  Appointment,
  Consultation,
  HistoryEntry,
  Hospitalization,
  LabExam,
  Patient,
  Surgery,
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

export type HistoryType = HistoryEntry["kind"];

// AAAA-MM-DD; los dos extremos se incluyen.
export interface HistoryFilters {
  from?: string;
  to?: string;
}

export interface HistoryQuery extends HistoryFilters {
  type?: HistoryType;
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
  // D-28 (3): la vacuna aplicada en una cita la pasa a Atendida (RN-53).
  appointmentId?: string;
}

// D-34: la fecha (AAAA-MM-DD) no puede ser futura.
export interface SurgeryInput {
  patientId: string;
  procedure: string;
  performedAt: string;
  notes?: string;
}

export interface LabExamInput {
  patientId: string;
  examType: string;
  performedAt: string;
  results: string;
}

// Los cambios de prueba viven mientras la pestaña está abierta.
const mockConsultationStore = structuredClone(mockConsultations);
const mockVaccinationStore = structuredClone(mockVaccinations);
const mockSurgeryStore = structuredClone(mockSurgeries);
const mockLabExamStore = structuredClone(mockLabExams);
const mockHospitalizationStore = structuredClone(mockHospitalizations);

function mockEntries(patientId: string): HistoryEntry[] {
  const of = <T extends { patientId: string }>(items: T[]) =>
    items.filter((item) => item.patientId === patientId);
  return [
    ...of(mockConsultationStore).map((consultation): HistoryEntry => ({
      kind: "CONSULTATION",
      date: consultation.createdAt,
      consultation,
    })),
    ...of(mockVaccinationStore).map((vaccination): HistoryEntry => ({
      kind: "VACCINATION",
      date: vaccination.appliedAt,
      vaccination,
    })),
    ...of(mockSurgeryStore).map((surgery): HistoryEntry => ({
      kind: "SURGERY",
      date: surgery.performedAt,
      surgery,
    })),
    ...of(mockLabExamStore).map((labExam): HistoryEntry => ({
      kind: "LAB_EXAM",
      date: labExam.performedAt,
      labExam,
    })),
    ...of(mockHospitalizationStore).map((hospitalization): HistoryEntry => ({
      kind: "HOSPITALIZATION",
      date: hospitalization.admittedAt,
      hospitalization,
    })),
  ];
}

// Día de la clínica de cada entrada: las fechas con hora se pasan a hora de Colombia.
const entryDate = (entry: HistoryEntry) =>
  entry.date.length > "AAAA-MM-DD".length ? clinicDateOf(new Date(entry.date)) : entry.date;

function mockHistory(patientId: string, { type, from, to }: HistoryQuery = {}): HistoryEntry[] {
  return mockEntries(patientId)
    .filter((entry) => !type || entry.kind === type)
    .filter((entry) => {
      const date = entryDate(entry);
      return (!from || date >= from) && (!to || date <= to);
    })
    .sort((a, b) => entryDate(b).localeCompare(entryDate(a)) || b.date.localeCompare(a.date));
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
export function getPatientHistory(
  patientId: string,
  query: HistoryQuery = {},
): Promise<HistoryEntry[]> {
  if (isMockEnabled) return mockResponse(mockHistory(patientId, query));
  return request<HistoryEntry[]>(`/patients/${patientId}/history`, { query: { ...query } });
}

async function mockMyHistory(patientId: string, filters: HistoryFilters): Promise<HistoryEntry[]> {
  await getMyPatient(patientId);
  const entries = mockHistory(patientId, filters)
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

async function mockMyVaccinationCard(patientId: string): Promise<VaccinationCardEntry[]> {
  await getMyPatient(patientId);
  return mockResponse(mockVaccinationCard(patientId));
}

// RN-40: solo las mascotas del propietario de la sesión.
export function getMyVaccinationCard(patientId: string): Promise<VaccinationCardEntry[]> {
  if (isMockEnabled) return mockMyVaccinationCard(patientId);
  return request<VaccinationCardEntry[]>(`/me/patients/${patientId}/vaccination-card`);
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
    getPatientHistory(appointment.patient.id, { type: "CONSULTATION" }),
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
  if (input.appointmentId) {
    const appointment = mockAppointmentById(input.appointmentId);
    if (appointment?.status !== "CONFIRMED") {
      return mockError(CONFLICT, "CONFLICT", "La cita no esta confirmada");
    }
    appointment.status = "ATTENDED";
  }
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

async function mockVeterinarian() {
  const me = await getMe();
  return mockVeterinarians.find((item) => item.userId === me.id);
}

const veterinarianName = ({
  id,
  firstNames,
  lastNames,
}: {
  id: string;
  firstNames: string;
  lastNames: string;
}) => ({
  id,
  firstNames,
  lastNames,
});

async function mockCreateSurgery(input: SurgeryInput): Promise<Surgery> {
  const veterinarian = await mockVeterinarian();
  if (!veterinarian) return mockError(FORBIDDEN, "FORBIDDEN", "No tienes permiso");
  const surgery: Surgery = {
    id: crypto.randomUUID(),
    patientId: input.patientId,
    veterinarian: veterinarianName(veterinarian),
    procedure: input.procedure,
    performedAt: input.performedAt,
    notes: input.notes ?? null,
    createdAt: new Date().toISOString(),
  };
  mockSurgeryStore.push(surgery);
  return mockResponse(surgery);
}

// RN-50: solo el veterinario registra cirugías, exámenes e internaciones (D-34).
export function registerSurgery(input: SurgeryInput): Promise<Surgery> {
  if (isMockEnabled) return mockCreateSurgery(input);
  return request<Surgery>("/surgeries", { method: "POST", body: input });
}

async function mockCreateLabExam(input: LabExamInput): Promise<LabExam> {
  const veterinarian = await mockVeterinarian();
  if (!veterinarian) return mockError(FORBIDDEN, "FORBIDDEN", "No tienes permiso");
  const labExam: LabExam = {
    ...input,
    id: crypto.randomUUID(),
    veterinarian: veterinarianName(veterinarian),
    createdAt: new Date().toISOString(),
  };
  mockLabExamStore.push(labExam);
  return mockResponse(labExam);
}

export function registerLabExam(input: LabExamInput): Promise<LabExam> {
  if (isMockEnabled) return mockCreateLabExam(input);
  return request<LabExam>("/lab-exams", { method: "POST", body: input });
}

async function mockAdmit(patientId: string, reason: string): Promise<Hospitalization> {
  const veterinarian = await mockVeterinarian();
  if (!veterinarian) return mockError(FORBIDDEN, "FORBIDDEN", "No tienes permiso");
  const open = mockHospitalizationStore.some(
    (item) => item.patientId === patientId && item.status === "ADMITTED",
  );
  if (open) {
    return mockError(CONFLICT, "CONFLICT", "La mascota ya tiene una internacion abierta");
  }
  const now = new Date().toISOString();
  const hospitalization: Hospitalization = {
    id: crypto.randomUUID(),
    patientId,
    veterinarian: veterinarianName(veterinarian),
    reason,
    status: "ADMITTED",
    admittedAt: now,
    dischargedAt: null,
    dischargeNotes: null,
    createdAt: now,
  };
  mockHospitalizationStore.push(hospitalization);
  return mockResponse(hospitalization);
}

// D-34: el ingreso toma la hora del servidor; una mascota no puede tener dos abiertas.
export function admitPatient(patientId: string, reason: string): Promise<Hospitalization> {
  if (isMockEnabled) return mockAdmit(patientId, reason);
  return request<Hospitalization>("/hospitalizations", {
    method: "POST",
    body: { patientId, reason },
  });
}

async function mockDischarge(id: string, notes?: string): Promise<Hospitalization> {
  if (!(await mockVeterinarian())) return mockError(FORBIDDEN, "FORBIDDEN", "No tienes permiso");
  const hospitalization = mockHospitalizationStore.find((item) => item.id === id);
  if (!hospitalization) return mockError(NOT_FOUND, "NOT_FOUND", "Internacion no encontrada");
  if (hospitalization.dischargedAt) {
    return mockError(CONFLICT, "CONFLICT", "La internacion ya tiene egreso");
  }
  Object.assign(hospitalization, {
    status: "DISCHARGED",
    dischargedAt: new Date().toISOString(),
    dischargeNotes: notes ?? null,
  });
  return mockResponse(hospitalization);
}

export function dischargePatient(id: string, notes?: string): Promise<Hospitalization> {
  if (isMockEnabled) return mockDischarge(id, notes);
  return request<Hospitalization>(`/hospitalizations/${id}/discharge`, {
    method: "PUT",
    body: notes ? { notes } : {},
  });
}

// La internación abierta de la mascota, si la tiene (a lo sumo una, D-34).
export async function getOpenHospitalization(patientId: string): Promise<Hospitalization | null> {
  if (isMockEnabled) {
    const open = mockHospitalizationStore.find(
      (item) => item.patientId === patientId && item.status === "ADMITTED",
    );
    return mockResponse(open ?? null);
  }
  const result = await request<Paginated<Hospitalization>>("/hospitalizations", {
    query: { status: "ADMITTED", patientId, limit: 1 },
  });
  return result.data[0] ?? null;
}
