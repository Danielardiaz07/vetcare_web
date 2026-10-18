import { request } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import { mockClinicPatients } from "@/services/mocks/fixtures";
import { listOwners } from "@/services/owners";
import type { Paginated } from "@/types/api";
import type { Patient, Sex, Species } from "@/types/domain";

const NOT_FOUND = 404;
const DEFAULT_PAGE_SIZE = 10;

export interface ListPatientsParams {
  page: number;
  limit?: number;
  q?: string;
  ownerId?: string;
  // La API no filtra por cédula: se busca primero el propietario y luego sus mascotas.
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

async function ownerIdByDocument(documentNumber: string): Promise<string | undefined> {
  const { data } = await listOwners({ page: 1, q: documentNumber });
  return data.find((owner) => owner.documentNumber === documentNumber)?.id;
}

// Los cambios de prueba viven mientras la pestaña está abierta.
const mockPatientStore = structuredClone(mockClinicPatients);

const mockNotFound = () => mockError(NOT_FOUND, "NOT_FOUND", "Paciente no encontrado");

function mockList(
  page: number,
  limit: number,
  q: string | undefined,
  ownerId: string | undefined,
): Promise<Paginated<Patient>> {
  const search = q?.toLowerCase();
  const matches = mockPatientStore
    .filter((pet) => !ownerId || pet.ownerId === ownerId)
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
  const owner = ownerDocument ? await ownerIdByDocument(ownerDocument) : ownerId;
  if (ownerDocument && !owner) return emptyPage(page, limit);
  if (isMockEnabled) return mockList(page, limit, q, owner);
  return request<Paginated<Patient>>("/patients", { query: { page, limit, q, ownerId: owner } });
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
    const pet: Patient = { ...input, id: crypto.randomUUID(), photoPath: null, active: true };
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
