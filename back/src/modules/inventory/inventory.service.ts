import { EXPIRING_SOON_DAYS } from "@/config/constants";
import type {
  CreateMedicationRequestDto,
  ExpiryStatus,
  InventoryAlertDto,
  InventoryAlertReason,
  InventoryAlertsResponseDto,
  InventoryItemDto,
  ListInventoryQueryDto,
  UpdateMedicationRequestDto,
  UpdateVaccineRequestDto,
} from "@/modules/inventory/dto/inventory.dto";
import type {
  InventoryChanges,
  InventoryFilters,
  InventoryRepository,
} from "@/modules/inventory/inventory.repository";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { addDays, clinicDateOf } from "@/shared/utils/clinic-time";
import { paginate, skipOf, type Paginated } from "@/shared/utils/pagination";

const ISO_DATE_LENGTH = 10;
const isoDate = (value: Date) => value.toISOString().slice(0, ISO_DATE_LENGTH);
const utcMidnight = (date: string) => new Date(`${date}T00:00:00.000Z`);

interface StockedProduct {
  id: string;
  name: string;
  price: { toNumber(): number };
  stock: number;
  minStock: number;
  expiresAt: Date | null;
  active: boolean;
}

// dto → cambios de BD: expiresAt llega como texto o null y se guarda como fecha.
function toChanges<T extends { expiresAt?: string | null }>(
  dto: T,
): Omit<T, "expiresAt"> & Pick<InventoryChanges, "expiresAt"> {
  const { expiresAt, ...rest } = dto;
  return {
    ...rest,
    ...(expiresAt !== undefined && {
      expiresAt: expiresAt === null ? null : utcMidnight(expiresAt),
    }),
  };
}

export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async listMedications(query: ListInventoryQueryDto): Promise<Paginated<InventoryItemDto>> {
    const today = this.today();
    const { items, total } = await this.repository.listMedications(this.filtersOf(query, today));
    return paginate(
      items.map((item) => this.toItem(item, today)),
      total,
      query.page,
      query.limit,
    );
  }

  async createMedication(dto: CreateMedicationRequestDto): Promise<InventoryItemDto> {
    if (await this.repository.medicationNameTaken(dto.name)) {
      throw new ConflictError("Ya existe un medicamento con ese nombre");
    }
    const { expiresAt, ...rest } = dto;
    const created = await this.repository.createMedication({
      ...rest,
      ...(expiresAt && { expiresAt: utcMidnight(expiresAt) }),
    });
    return this.toItem(created, this.today());
  }

  async updateMedication(id: string, dto: UpdateMedicationRequestDto): Promise<InventoryItemDto> {
    if (!(await this.repository.findMedication(id))) {
      throw new NotFoundError("Medicamento no encontrado");
    }
    if (dto.name && (await this.repository.medicationNameTaken(dto.name, id))) {
      throw new ConflictError("Ya existe un medicamento con ese nombre");
    }
    const updated = await this.repository.updateMedication(id, toChanges(dto));
    return this.toItem(updated, this.today());
  }

  async listVaccines(query: ListInventoryQueryDto): Promise<Paginated<InventoryItemDto>> {
    const today = this.today();
    const { items, total } = await this.repository.listVaccines(this.filtersOf(query, today));
    return paginate(
      items.map((item) => this.toItem(item, today)),
      total,
      query.page,
      query.limit,
    );
  }

  async updateVaccine(id: string, dto: UpdateVaccineRequestDto): Promise<InventoryItemDto> {
    if (!(await this.repository.findVaccine(id))) throw new NotFoundError("Vacuna no encontrada");
    if (dto.name && (await this.repository.vaccineNameTaken(dto.name, id))) {
      throw new ConflictError("Ya existe una vacuna con ese nombre");
    }
    const updated = await this.repository.updateVaccine(id, toChanges(dto));
    return this.toItem(updated, this.today());
  }

  // RN-56, D-36: solo productos activos; stock crítico = stock <= mínimo del producto; por vencer a EXPIRING_SOON_DAYS.
  async alerts(): Promise<InventoryAlertsResponseDto> {
    const today = this.today();
    const [medications, vaccines] = await Promise.all([
      this.repository.activeMedications(),
      this.repository.activeVaccines(),
    ]);

    const items: InventoryAlertDto[] = [
      ...medications.map((item) => this.toAlert("MEDICATION", item, today)),
      ...vaccines.map((item) => this.toAlert("VACCINE", item, today)),
    ].filter((alert) => alert.reasons.length > 0);

    const count = (reason: InventoryAlertReason) =>
      items.filter((alert) => alert.reasons.includes(reason)).length;
    return {
      expiringDays: EXPIRING_SOON_DAYS,
      counts: {
        lowStock: count("LOW_STOCK"),
        expiring: count("EXPIRING"),
        expired: count("EXPIRED"),
      },
      items,
    };
  }

  private today(): string {
    return clinicDateOf(this.clock());
  }

  private filtersOf(query: ListInventoryQueryDto, today: string): InventoryFilters {
    return {
      q: query.q,
      active: query.active,
      alert: query.alert,
      expiringUntil: utcMidnight(addDays(today, EXPIRING_SOON_DAYS)),
      skip: skipOf(query.page, query.limit),
      take: query.limit,
    };
  }

  private expiryOf(expiresAt: Date | null, today: string): ExpiryStatus {
    if (!expiresAt) return "NONE";
    const date = isoDate(expiresAt);
    if (date < today) return "EXPIRED";
    return date <= addDays(today, EXPIRING_SOON_DAYS) ? "EXPIRING" : "OK";
  }

  private toItem(item: StockedProduct, today: string): InventoryItemDto {
    return {
      id: item.id,
      name: item.name,
      price: item.price.toNumber(),
      stock: item.stock,
      minStock: item.minStock,
      expiresAt: item.expiresAt ? isoDate(item.expiresAt) : null,
      active: item.active,
      lowStock: item.stock <= item.minStock,
      expiry: this.expiryOf(item.expiresAt, today),
    };
  }

  private toAlert(
    kind: InventoryAlertDto["kind"],
    item: StockedProduct,
    today: string,
  ): InventoryAlertDto {
    const expiry = this.expiryOf(item.expiresAt, today);
    const reasons: InventoryAlertReason[] = [];
    if (item.stock <= item.minStock) reasons.push("LOW_STOCK");
    if (expiry === "EXPIRING") reasons.push("EXPIRING");
    if (expiry === "EXPIRED") reasons.push("EXPIRED");
    return {
      kind,
      id: item.id,
      name: item.name,
      stock: item.stock,
      minStock: item.minStock,
      expiresAt: item.expiresAt ? isoDate(item.expiresAt) : null,
      reasons,
    };
  }
}
