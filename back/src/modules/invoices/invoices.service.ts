import { InvoiceStatus, Prisma, Role } from "@prisma/client";
import { IVA_RATE_PERCENT, MONEY_DECIMALS } from "@/config/constants";
import type {
  CreateInvoiceRequestDto,
  InvoiceResponseDto,
  ListInvoicesQueryDto,
  ListMyInvoicesQueryDto,
  PendingConceptDto,
  VoidInvoiceRequestDto,
} from "@/modules/invoices/dto/invoices.dto";
import type {
  InvoiceRecord,
  InvoicesRepository,
  NewInvoiceItemData,
} from "@/modules/invoices/invoices.repository";
import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors";
import { paginate, skipOf, type Paginated } from "@/shared/utils/pagination";

export interface Actor {
  id: string;
  role: Role;
}

const INVOICE_NUMBER_DIGITS = 6;
const PERCENT = 100;

const formatNumber = (number: number): string =>
  `FAC-${String(number).padStart(INVOICE_NUMBER_DIGITS, "0")}`;

// RN-71: IVA por línea, redondeado a centavos, para que el total coincida con la suma del detalle.
const taxOf = (amount: Prisma.Decimal, taxed: boolean): Prisma.Decimal =>
  taxed
    ? amount
        .mul(IVA_RATE_PERCENT)
        .div(PERCENT)
        .toDecimalPlaces(MONEY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP)
    : new Prisma.Decimal(0);

function toResponse(record: InvoiceRecord): InvoiceResponseDto {
  return {
    id: record.id,
    number: formatNumber(record.number),
    status: record.status,
    paymentMethod: record.paymentMethod,
    owner: record.owner,
    subtotal: record.subtotal.toNumber(),
    tax: record.tax.toNumber(),
    total: record.total.toNumber(),
    voidReason: record.voidReason,
    items: record.items.map((item) => ({
      id: item.id,
      description: item.description,
      amount: item.amount.toNumber(),
      taxed: item.taxed,
      tax: taxOf(item.amount, item.taxed).toNumber(),
      consultationId: item.consultationId,
      vaccinationId: item.vaccinationId,
    })),
    createdAt: record.createdAt,
  };
}

export class InvoicesService {
  constructor(private readonly repository: InvoicesRepository) {}

  // RN-70: conceptos del propietario aún sin facturar.
  async pending(ownerId: string): Promise<PendingConceptDto[]> {
    await this.assertOwner(ownerId);
    const [consultations, vaccinations] = await Promise.all([
      this.repository.pendingConsultations(ownerId),
      this.repository.pendingVaccinations(ownerId),
    ]);
    const concepts: PendingConceptDto[] = [
      ...consultations.map((item) => ({
        kind: "CONSULTATION" as const,
        id: item.id,
        description: `Consulta - ${item.patient.name}`,
        patientName: item.patient.name,
        amount: item.cost.toNumber(),
        date: item.createdAt,
      })),
      ...vaccinations.map((item) => ({
        kind: "VACCINATION" as const,
        id: item.id,
        description: `Vacuna ${item.vaccine.name} - ${item.patient.name}`,
        patientName: item.patient.name,
        amount: item.price.toNumber(),
        date: item.createdAt,
      })),
    ];
    return concepts.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async create(dto: CreateInvoiceRequestDto): Promise<InvoiceResponseDto> {
    await this.assertOwner(dto.ownerId);
    const [consultations, vaccinations] = await Promise.all([
      this.repository.pendingConsultations(dto.ownerId, dto.consultationIds),
      this.repository.pendingVaccinations(dto.ownerId, dto.vaccinationIds),
    ]);
    const expected = new Set(dto.consultationIds).size + new Set(dto.vaccinationIds).size;
    if (consultations.length + vaccinations.length !== expected) {
      throw new ConflictError("Algun concepto no es del propietario o ya fue facturado");
    }

    const items: NewInvoiceItemData[] = [
      ...consultations.map((item) => ({
        consultationId: item.id,
        description: `Consulta - ${item.patient.name}`,
        amount: item.cost,
        taxed: true, // D-27: todo lo facturado lleva IVA
      })),
      ...vaccinations.map((item) => ({
        vaccinationId: item.id,
        description: `Vacuna ${item.vaccine.name} - ${item.patient.name}`,
        amount: item.price,
        taxed: true,
      })),
    ];
    const subtotal = items.reduce((sum, item) => sum.add(item.amount), new Prisma.Decimal(0));
    const tax = items.reduce(
      (sum, item) => sum.add(taxOf(item.amount, item.taxed)),
      new Prisma.Decimal(0),
    );

    const created = await this.repository.create({
      ownerId: dto.ownerId,
      paymentMethod: dto.paymentMethod,
      subtotal,
      tax,
      total: subtotal.add(tax),
      items,
    });
    return toResponse(created);
  }

  async list(query: ListInvoicesQueryDto): Promise<Paginated<InvoiceResponseDto>> {
    const { items, total } = await this.repository.list({
      ownerId: query.ownerId,
      status: query.status,
      skip: skipOf(query.page, query.limit),
      take: query.limit,
    });
    return paginate(items.map(toResponse), total, query.page, query.limit);
  }

  async getById(actor: Actor, id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.findOrFail(id);
    if (actor.role === Role.OWNER) {
      const ownerId = await this.repository.findOwnerIdByUserId(actor.id);
      if (ownerId !== invoice.ownerId) throw new ForbiddenError();
    }
    return toResponse(invoice);
  }

  async listMine(
    userId: string,
    query: ListMyInvoicesQueryDto,
  ): Promise<Paginated<InvoiceResponseDto>> {
    const ownerId = await this.repository.findOwnerIdByUserId(userId);
    if (!ownerId) throw new ForbiddenError();
    return this.list({ ...query, ownerId, status: InvoiceStatus.PAID });
  }

  // RN-74: una factura pagada no se edita; solo se anula con motivo.
  async void(id: string, dto: VoidInvoiceRequestDto): Promise<InvoiceResponseDto> {
    const invoice = await this.findOrFail(id);
    if (invoice.status === InvoiceStatus.VOIDED)
      throw new ConflictError("La factura ya esta anulada");
    return toResponse(await this.repository.void(id, dto.reason));
  }

  private async assertOwner(ownerId: string): Promise<void> {
    const owner = await this.repository.findOwnerState(ownerId);
    if (!owner) throw new NotFoundError("Propietario no encontrado");
  }

  private async findOrFail(id: string): Promise<InvoiceRecord> {
    const invoice = await this.repository.findById(id);
    if (!invoice) throw new NotFoundError("Factura no encontrada");
    return invoice;
  }
}
