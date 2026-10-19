import { request } from "@/services/http-client";
import { isMockEnabled, isNewAccount, mockError, mockResponse } from "@/services/mocks";
import { FIELD_LIMITS } from "@/lib/constants";
import { mockClinicPatients, mockOwner, mockOwners } from "@/services/mocks/fixtures";
import type { Paginated } from "@/types/api";
import type { Patient, Sex, Species } from "@/types/domain";

const FORBIDDEN = 403;
const NOT_FOUND = 404;
const DEFAULT_PAGE_SIZE = 10;
// Un propietario tiene pocas mascotas; una sola página las trae todas.
const MY_PATIENTS_LIMIT = 100;

export interface ListPatientsParams {
  page: number;
  limit?: number;
  q?: string;
  ownerId?: string;
  // D-28 (1): cédula exacta del propietario.
  ownerDocument?: string;
}

export interface PatientInput {
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  birthDate: string;
  weightKg: number;
}

export type CreatePatientInput = PatientInput & { ownerId: string };

// RN-16: el paciente no cambia de propietario.
export type UpdatePatientInput = Partial<PatientInput>;

const emptyPage = (page: number, limit: number): Paginated<Patient> => ({
  data: [],
  meta: { page, limit, total: 0, totalPages: 0 },
});

// La API rechaza (422) una cédula fuera de 6 a 10 dígitos; esa búsqueda no tiene resultados.
const isDocumentNumber = (value: string) =>
  value.length >= FIELD_LIMITS.DOCUMENT_NUMBER_MIN &&
  value.length <= FIELD_LIMITS.DOCUMENT_NUMBER_MAX;

// Los cambios de prueba viven mientras la pestaña está abierta.
const mockPatientStore = structuredClone(mockClinicPatients);

const mockNotFound = () => mockError(NOT_FOUND, "NOT_FOUND", "Paciente no encontrado");

function mockList(
  page: number,
  limit: number,
  q: string | undefined,
  ownerId: string | undefined,
  ownerDocument: string | undefined,
): Promise<Paginated<Patient>> {
  const search = q?.toLowerCase();
  const matches = mockPatientStore
    .filter((pet) => !ownerId || pet.ownerId === ownerId)
    .filter((pet) => !ownerDocument || pet.owner.documentNumber === ownerDocument)
    .filter((pet) => !search || pet.name.toLowerCase().includes(search))
    .sort((a, b) => a.name.localeCompare(b.name));
  const total = matches.length;
  return mockResponse({
    data: matches.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

function mockUpdate(id: string, changes: Partial<Patient>): Promise<Patient> {
  const pet = mockPatientStore.find((item) => item.id === id);
  if (!pet) return mockNotFound();
  Object.assign(pet, changes);
  return mockResponse(pet);
}

export async function listPatients({
  page,
  limit = DEFAULT_PAGE_SIZE,
  q,
  ownerId,
  ownerDocument,
}: ListPatientsParams): Promise<Paginated<Patient>> {
  if (ownerDocument !== undefined && !isDocumentNumber(ownerDocument)) {
    return emptyPage(page, limit);
  }
  if (isMockEnabled) return mockList(page, limit, q, ownerId, ownerDocument);
  return request<Paginated<Patient>>("/patients", {
    query: { page, limit, q, ownerId, ownerDocument },
  });
}

export function getPatient(id: string): Promise<Patient> {
  if (isMockEnabled) {
    const pet = mockPatientStore.find((item) => item.id === id);
    return pet ? mockResponse(pet) : mockNotFound();
  }
  return request<Patient>(`/patients/${id}`);
}

export function createPatient(input: CreatePatientInput): Promise<Patient> {
  if (isMockEnabled) {
    const owner = mockOwners.find((item) => item.id === input.ownerId) ?? mockOwner;
    const pet: Patient = {
      ...input,
      owner: {
        id: owner.id,
        firstNames: owner.firstNames,
        lastNames: owner.lastNames,
        documentNumber: owner.documentNumber,
      },
      id: crypto.randomUUID(),
      photoPath: null,
      active: true,
    };
    mockPatientStore.push(pet);
    return mockResponse(pet);
  }
  return request<Patient>("/patients", { method: "POST", body: input });
}

export function updatePatient(id: string, input: UpdatePatientInput): Promise<Patient> {
  if (isMockEnabled) return mockUpdate(id, input);
  return request<Patient>(`/patients/${id}`, { method: "PATCH", body: input });
}

// RN-14: se desactiva, no se elimina, para conservar el historial.
export async function deactivatePatient(id: string): Promise<void> {
  if (isMockEnabled) {
    await mockUpdate(id, { active: false });
    return;
  }
  return request<void>(`/patients/${id}`, { method: "DELETE" });
}

// Portal (RN-16): la API solo devuelve las mascotas activas del propietario con sesión.
export async function getMyPatients(): Promise<Patient[]> {
  if (isMockEnabled) {
    const pets = isNewAccount
      ? []
      : mockPatientStore
          .filter((pet) => pet.ownerId === mockOwner.id && pet.active)
          .sort((a, b) => a.name.localeCompare(b.name));
    return mockResponse(pets);
  }
  const { data } = await request<Paginated<Patient>>("/me/patients", {
    query: { page: 1, limit: MY_PATIENTS_LIMIT },
  });
  return data;
}

// RN-40: una mascota de otro propietario responde 403.
export function getMyPatient(id: string): Promise<Patient> {
  if (isMockEnabled) {
    const pet = mockPatientStore.find((item) => item.id === id);
    if (!pet) return mockNotFound();
    if (pet.ownerId !== mockOwner.id) return mockError(FORBIDDEN, "FORBIDDEN", "Acceso denegado");
    return mockResponse(pet);
  }
  return request<Patient>(`/me/patients/${id}`);
}
