import { request } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import { mockOwners } from "@/services/mocks/fixtures";
import type { Paginated } from "@/types/api";
import type { DocumentType, Owner } from "@/types/domain";

const NOT_FOUND = 404;
const CONFLICT = 409;
const PAGE_SIZE = 10;
// La API guarda el celular con el indicativo; los formularios usan los 10 dígitos.
const COLOMBIA_PHONE_PREFIX = "57";
const PHONE_WITH_PREFIX_LENGTH = 12;

export interface ListOwnersParams {
  page: number;
  q?: string;
}

export interface CreateOwnerInput {
  documentType: DocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  email: string;
  phone: string;
  address?: string;
}

// RN-17: la cédula y su tipo no se editan.
export type UpdateOwnerInput = Partial<{
  firstNames: string;
  lastNames: string;
  email: string;
  phone: string;
  address: string | null;
}>;

function withLocalPhone(owner: Owner): Owner {
  const { phone } = owner;
  const hasPrefix =
    phone.length === PHONE_WITH_PREFIX_LENGTH && phone.startsWith(COLOMBIA_PHONE_PREFIX);
  return hasPrefix ? { ...owner, phone: phone.slice(COLOMBIA_PHONE_PREFIX.length) } : owner;
}

// Los cambios de prueba viven mientras la pestaña está abierta.
const mockOwnerStore = structuredClone(mockOwners);

const mockNotFound = () => mockError(NOT_FOUND, "NOT_FOUND", "Propietario no encontrado");

function mockList({ page, q }: ListOwnersParams): Promise<Paginated<Owner>> {
  const search = q?.toLowerCase();
  const matches = mockOwnerStore
    .filter(
      (owner) =>
        !search ||
        owner.documentNumber.includes(search) ||
        owner.firstNames.toLowerCase().includes(search) ||
        owner.lastNames.toLowerCase().includes(search),
    )
    .sort((a, b) => a.lastNames.localeCompare(b.lastNames));
  const total = matches.length;
  return mockResponse({
    data: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    meta: { page, limit: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
  });
}

function mockGet(id: string): Promise<Owner> {
  const owner = mockOwnerStore.find((item) => item.id === id);
  return owner ? mockResponse(owner) : mockNotFound();
}

function mockCreate(input: CreateOwnerInput): Promise<Owner> {
  if (mockOwnerStore.some((owner) => owner.documentNumber === input.documentNumber)) {
    return mockError(CONFLICT, "CONFLICT", "La cedula ya esta registrada");
  }
  const owner: Owner = {
    ...input,
    id: crypto.randomUUID(),
    address: input.address ?? null,
    active: true,
    hasAccount: false,
  };
  mockOwnerStore.push(owner);
  return mockResponse(owner);
}

// D-18: con cuenta, el correo nuevo no puede ser el de otra cuenta.
function mockUpdate(id: string, input: UpdateOwnerInput): Promise<Owner> {
  const owner = mockOwnerStore.find((item) => item.id === id);
  if (!owner) return mockNotFound();
  const emailTaken = mockOwnerStore.some(
    (other) => other.id !== id && other.hasAccount && other.email === input.email,
  );
  if (owner.hasAccount && input.email !== undefined && emailTaken) {
    return mockError(CONFLICT, "CONFLICT", "El correo ya esta registrado");
  }
  Object.assign(owner, input);
  return mockResponse(owner);
}

function mockDeactivate(id: string): Promise<void> {
  const owner = mockOwnerStore.find((item) => item.id === id);
  if (!owner) return mockNotFound();
  owner.active = false;
  return mockResponse(undefined);
}

export async function listOwners(params: ListOwnersParams): Promise<Paginated<Owner>> {
  if (isMockEnabled) return mockList(params);
  const result = await request<Paginated<Owner>>("/owners", {
    query: { ...params, limit: PAGE_SIZE },
  });
  return { ...result, data: result.data.map(withLocalPhone) };
}

export async function getOwner(id: string): Promise<Owner> {
  if (isMockEnabled) return mockGet(id);
  return withLocalPhone(await request<Owner>(`/owners/${id}`));
}

export async function createOwner(input: CreateOwnerInput): Promise<Owner> {
  if (isMockEnabled) return mockCreate(input);
  return withLocalPhone(await request<Owner>("/owners", { method: "POST", body: input }));
}

export async function updateOwner(id: string, input: UpdateOwnerInput): Promise<Owner> {
  if (isMockEnabled) return mockUpdate(id, input);
  return withLocalPhone(await request<Owner>(`/owners/${id}`, { method: "PATCH", body: input }));
}

// RN-14: se desactiva, no se elimina, para conservar el historial.
export function deactivateOwner(id: string): Promise<void> {
  if (isMockEnabled) return mockDeactivate(id);
  return request<void>(`/owners/${id}`, { method: "DELETE" });
}
