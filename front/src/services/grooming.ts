import { mockAppointmentById } from "@/services/appointments";
import { getMe } from "@/services/auth";
import { request } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import { mockGroomers, mockGroomingServices } from "@/services/mocks/fixtures";
import { getMyPatient } from "@/services/patients";
import type { GroomingService, GroomingType } from "@/types/domain";

const FORBIDDEN = 403;
const NOT_FOUND = 404;
const CONFLICT = 409;

export interface GroomingServiceInput {
  patientId: string;
  // RN-51: la cita es opcional; si viene, la API la pasa a Atendida.
  appointmentId?: string;
  type: GroomingType;
  observations?: string;
  cost: number;
}

// Los cambios de prueba viven mientras la pestaña está abierta.
export const mockGroomingStore = structuredClone(mockGroomingServices);

const newestFirst = (items: GroomingService[]) =>
  [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const mockOfPatient = (patientId: string) =>
  newestFirst(mockGroomingStore.filter((item) => item.patientId === patientId));

async function mockCreate(input: GroomingServiceInput): Promise<GroomingService> {
  const me = await getMe();
  const groomer = mockGroomers.find((item) => item.userId === me.id);
  if (!groomer) return mockError(FORBIDDEN, "FORBIDDEN", "No tienes permiso");
  if (input.appointmentId) {
    const appointment = mockAppointmentById(input.appointmentId);
    if (!appointment) return mockError(NOT_FOUND, "NOT_FOUND", "Cita no encontrada");
    if (appointment.type !== "GROOMING") {
      return mockError(CONFLICT, "CONFLICT", "La cita no es de estetica");
    }
    if (appointment.professional.id !== groomer.id) {
      return mockError(
        FORBIDDEN,
        "FORBIDDEN",
        "Solo el estilista asignado puede registrar el servicio",
      );
    }
    if (appointment.status !== "CONFIRMED") {
      return mockError(
        CONFLICT,
        "CONFLICT",
        "Solo se registra un servicio sobre una cita confirmada",
      );
    }
    appointment.status = "ATTENDED";
  }
  const service: GroomingService = {
    id: crypto.randomUUID(),
    appointmentId: input.appointmentId ?? null,
    patientId: input.patientId,
    type: input.type,
    observations: input.observations ?? null,
    cost: input.cost,
    groomer: { id: groomer.id, firstNames: groomer.firstNames, lastNames: groomer.lastNames },
    createdAt: new Date().toISOString(),
  };
  mockGroomingStore.push(service);
  return mockResponse(service);
}

// RN-51: solo el estilista lo registra; queda pendiente de facturar (D-33).
export function createGroomingService(input: GroomingServiceInput): Promise<GroomingService> {
  if (isMockEnabled) return mockCreate(input);
  return request<GroomingService>("/grooming-services", { method: "POST", body: input });
}

export function getPatientGroomingServices(patientId: string): Promise<GroomingService[]> {
  if (isMockEnabled) return mockResponse(mockOfPatient(patientId));
  return request<GroomingService[]>(`/patients/${patientId}/grooming-services`);
}

async function mockMine(patientId: string): Promise<GroomingService[]> {
  await getMyPatient(patientId);
  return mockResponse(mockOfPatient(patientId));
}

// RN-40: solo las mascotas del propietario de la sesión.
export function getMyPetGroomingServices(patientId: string): Promise<GroomingService[]> {
  if (isMockEnabled) return mockMine(patientId);
  return request<GroomingService[]>(`/me/patients/${patientId}/grooming-services`);
}
