import { InvoiceStatus, Prisma, type PaymentMethod } from "@prisma/client";
import { ConflictError } from "@/shared/errors";
import { prisma } from "@/shared/prisma";

const UNIQUE_VIOLATION = "P2002";

const invoiceInclude = {
  owner: { select: { id: true, firstNames: true, lastNames: true, documentNumber: true } },
  items: { orderBy: { description: "asc" } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceRecord = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

const pendingConsultationArgs = {
  include: { patient: { select: { name: true } } },
} satisfies Prisma.ConsultationDefaultArgs;
const pendingVaccinationArgs = {
  include: { patient: { select: { name: true } }, vaccine: { select: { name: true } } },
} satisfies Prisma.VaccinationDefaultArgs;

export type PendingConsultationRecord = Prisma.ConsultationGetPayload<
  typeof pendingConsultationArgs
>;
export type PendingVaccinationRecord = Prisma.VaccinationGetPayload<typeof pendingVaccinationArgs>;

export interface NewInvoiceItemData {
  consultationId?: string;
  vaccinationId?: string;
  description: string;
  amount: Prisma.Decimal;
  taxed: boolean;
}

export interface NewInvoiceData {
  ownerId: string;
  paymentMethod: PaymentMethod;
  subtotal: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
  items: NewInvoiceItemData[];
}

export interface InvoiceListFilters {
  ownerId?: string;
  status?: InvoiceStatus;
  skip: number;
  take: number;
}

const pendingOf = (ownerId: string, ids?: string[]) => ({
  patient: { ownerId },
  invoiceItem: null,
  ...(ids && { id: { in: ids } }),
});

export class InvoicesRepository {
  async findOwnerState(ownerId: string): Promise<{ active: boolean } | null> {
    return prisma.owner.findUnique({ where: { id: ownerId }, select: { active: true } });
  }

  async findOwnerIdByUserId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { ownerId: true } });
    return user?.ownerId ?? null;
  }

  pendingConsultations(ownerId: string, ids?: string[]): Promise<PendingConsultationRecord[]> {
    return prisma.consultation.findMany({
      where: pendingOf(ownerId, ids),
      orderBy: { createdAt: "asc" },
      ...pendingConsultationArgs,
    });
  }

  pendingVaccinations(ownerId: string, ids?: string[]): Promise<PendingVaccinationRecord[]> {
    return prisma.vaccination.findMany({
      where: pendingOf(ownerId, ids),
      orderBy: { appliedAt: "asc" },
      ...pendingVaccinationArgs,
    });
  }

  // RN-75: factura y detalles se crean en una sola escritura anidada; si algo falla, no queda nada.
  async create(data: NewInvoiceData): Promise<InvoiceRecord> {
    const { items, ...invoice } = data;
    try {
      return await prisma.invoice.create({
        data: { ...invoice, items: { create: items } },
        include: invoiceInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictError("Alguno de los conceptos ya fue facturado");
      }
      throw error;
    }
  }

  findById(id: string): Promise<InvoiceRecord | null> {
    return prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
  }

  async list(filters: InvoiceListFilters): Promise<{ items: InvoiceRecord[]; total: number }> {
    const where: Prisma.InvoiceWhereInput = {
      ...(filters.ownerId && { ownerId: filters.ownerId }),
      ...(filters.status && { status: filters.status }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        orderBy: { number: "desc" },
        skip: filters.skip,
        take: filters.take,
        include: invoiceInclude,
      }),
      prisma.invoice.count({ where }),
    ]);
    return { items, total };
  }

  // Anular libera los conceptos para poder facturarlos de nuevo (RN-73, RN-74).
  async void(id: string, reason: string): Promise<InvoiceRecord> {
    return prisma.$transaction(async (tx) => {
      await tx.invoiceItem.updateMany({
        where: { invoiceId: id },
        data: { consultationId: null, vaccinationId: null },
      });
      return tx.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.VOIDED, voidReason: reason },
        include: invoiceInclude,
      });
    });
  }
}
