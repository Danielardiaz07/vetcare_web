import { request } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import {
  mockClinicPatients,
  mockConsultations,
  mockInvoices,
  mockOwners,
  mockVaccinations,
} from "@/services/mocks/fixtures";
import { IVA_RATE_PERCENT } from "@/lib/constants";
import type { Paginated } from "@/types/api";
import type { Invoice, InvoiceStatus, PaymentMethod, PendingConcept } from "@/types/domain";

const NOT_FOUND = 404;
const CONFLICT = 409;
const PAGE_SIZE = 10;
const CENTS = 100;
const INVOICE_NUMBER_DIGITS = 6;

export interface ListInvoicesParams {
  page: number;
  status?: InvoiceStatus;
}

export interface CreateInvoiceInput {
  ownerId: string;
  paymentMethod: PaymentMethod;
  consultationIds: string[];
  vaccinationIds: string[];
}

// RN-71: IVA por concepto, redondeado al centavo, igual que la API.
export const taxOf = (amount: number) => Math.round(amount * IVA_RATE_PERCENT) / CENTS;

// Los cambios de prueba viven mientras la pestaña está abierta.
const mockInvoiceStore = structuredClone(mockInvoices);

const patientOf = (patientId: string) => mockClinicPatients.find((item) => item.id === patientId);

// RN-73: un concepto de una factura anulada vuelve a quedar pendiente.
function isInvoiced(kind: PendingConcept["kind"], id: string): boolean {
  return mockInvoiceStore.some(
    (invoice) =>
      invoice.status === "PAID" &&
      invoice.items.some((item) =>
        kind === "CONSULTATION" ? item.consultationId === id : item.vaccinationId === id,
      ),
  );
}

function mockConcepts(ownerId: string): PendingConcept[] {
  const consultations = mockConsultations.flatMap((item) => {
    const patient = patientOf(item.patientId);
    if (patient?.ownerId !== ownerId || isInvoiced("CONSULTATION", item.id)) return [];
    return [
      {
        kind: "CONSULTATION" as const,
        id: item.id,
        description: `Consulta - ${patient.name}`,
        patientName: patient.name,
        amount: item.cost,
        date: item.createdAt,
      },
    ];
  });
  const vaccinations = mockVaccinations.flatMap((item) => {
    const patient = patientOf(item.patientId);
    if (patient?.ownerId !== ownerId || isInvoiced("VACCINATION", item.id)) return [];
    return [
      {
        kind: "VACCINATION" as const,
        id: item.id,
        description: `Vacuna ${item.vaccine.name} - ${patient.name}`,
        patientName: patient.name,
        amount: item.price,
        date: item.createdAt,
      },
    ];
  });
  return [...consultations, ...vaccinations].sort((a, b) => a.date.localeCompare(b.date));
}

function mockCreate(input: CreateInvoiceInput): Promise<Invoice> {
  const owner = mockOwners.find((item) => item.id === input.ownerId);
  if (!owner) return mockError(NOT_FOUND, "NOT_FOUND", "Propietario no encontrado");
  const pending = mockConcepts(input.ownerId);
  const chosen = pending.filter((concept) =>
    (concept.kind === "CONSULTATION" ? input.consultationIds : input.vaccinationIds).includes(
      concept.id,
    ),
  );
  if (chosen.length !== input.consultationIds.length + input.vaccinationIds.length) {
    return mockError(
      CONFLICT,
      "CONFLICT",
      "Algun concepto no es del propietario o ya fue facturado",
    );
  }
  const items = chosen.map((concept) => ({
    id: crypto.randomUUID(),
    description: concept.description,
    amount: concept.amount,
    taxed: true,
    tax: taxOf(concept.amount),
    consultationId: concept.kind === "CONSULTATION" ? concept.id : null,
    vaccinationId: concept.kind === "VACCINATION" ? concept.id : null,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = items.reduce((sum, item) => sum + item.tax, 0);
  const invoice: Invoice = {
    id: crypto.randomUUID(),
    number: `FAC-${String(mockInvoiceStore.length + 1).padStart(INVOICE_NUMBER_DIGITS, "0")}`,
    status: "PAID",
    paymentMethod: input.paymentMethod,
    owner: {
      id: owner.id,
      firstNames: owner.firstNames,
      lastNames: owner.lastNames,
      documentNumber: owner.documentNumber,
    },
    subtotal,
    tax,
    total: subtotal + tax,
    voidReason: null,
    items,
    createdAt: new Date().toISOString(),
  };
  mockInvoiceStore.push(invoice);
  return mockResponse(invoice);
}

function mockList({ page, status }: ListInvoicesParams): Promise<Paginated<Invoice>> {
  const matches = mockInvoiceStore
    .filter((invoice) => !status || invoice.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = matches.length;
  return mockResponse({
    data: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    meta: { page, limit: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
  });
}

function mockVoid(id: string, reason: string): Promise<Invoice> {
  const invoice = mockInvoiceStore.find((item) => item.id === id);
  if (!invoice) return mockError(NOT_FOUND, "NOT_FOUND", "Factura no encontrada");
  if (invoice.status === "VOIDED") {
    return mockError(CONFLICT, "CONFLICT", "La factura ya esta anulada");
  }
  Object.assign(invoice, { status: "VOIDED", voidReason: reason });
  return mockResponse(invoice);
}

export function getPendingConcepts(ownerId: string): Promise<PendingConcept[]> {
  if (isMockEnabled) return mockResponse(mockConcepts(ownerId));
  return request<PendingConcept[]>("/invoices/pending", { query: { ownerId } });
}

// RN-75: la API la crea en una transacción; nunca queda una factura a medias.
export function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  if (isMockEnabled) return mockCreate(input);
  return request<Invoice>("/invoices", { method: "POST", body: input });
}

export function listInvoices(params: ListInvoicesParams): Promise<Paginated<Invoice>> {
  if (isMockEnabled) return mockList(params);
  return request<Paginated<Invoice>>("/invoices", { query: { ...params, limit: PAGE_SIZE } });
}

// RN-74: solo el ADMIN la anula, y siempre con motivo.
export function voidInvoice(id: string, reason: string): Promise<Invoice> {
  if (isMockEnabled) return mockVoid(id, reason);
  return request<Invoice>(`/invoices/${id}/void`, { method: "PUT", body: { reason } });
}
