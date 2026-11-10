import { Prisma, type Medication, type Vaccine } from "@prisma/client";
import { ConflictError } from "@/shared/errors";
import { prisma } from "@/shared/prisma";

const UNIQUE_VIOLATION = "P2002";

export interface InventoryFilters {
  q?: string;
  active?: boolean;
  alert?: "LOW_STOCK" | "EXPIRING";
  expiringUntil: Date; // a esta fecha o antes cuenta como "por vencer"
  skip: number;
  take: number;
}

export interface NewMedicationData {
  name: string;
  price: number;
  stock: number;
  minStock: number;
  expiresAt?: Date;
}

export interface InventoryChanges {
  name?: string;
  price?: number;
  stock?: number;
  minStock?: number;
  expiresAt?: Date | null;
  active?: boolean;
}

const nameConflict = (error: unknown, message: string): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION) {
    throw new ConflictError(message);
  }
  throw error;
};

// "Stock crítico" compara dos columnas de la misma fila, por eso usa referencias de campo de Prisma.
const medicationWhere = (filters: InventoryFilters): Prisma.MedicationWhereInput => ({
  ...(filters.q && { name: { contains: filters.q, mode: "insensitive" } }),
  ...(filters.active !== undefined && { active: filters.active }),
  ...(filters.alert === "LOW_STOCK" && {
    active: true,
    stock: { lte: prisma.medication.fields.minStock },
  }),
  ...(filters.alert === "EXPIRING" && {
    active: true,
    expiresAt: { not: null, lte: filters.expiringUntil },
  }),
});

const vaccineWhere = (filters: InventoryFilters): Prisma.VaccineWhereInput => ({
  ...(filters.q && { name: { contains: filters.q, mode: "insensitive" } }),
  ...(filters.active !== undefined && { active: filters.active }),
  ...(filters.alert === "LOW_STOCK" && {
    active: true,
    stock: { lte: prisma.vaccine.fields.minStock },
  }),
  ...(filters.alert === "EXPIRING" && {
    active: true,
    expiresAt: { not: null, lte: filters.expiringUntil },
  }),
});

export class InventoryRepository {
  async listMedications(
    filters: InventoryFilters,
  ): Promise<{ items: Medication[]; total: number }> {
    const where = medicationWhere(filters);
    const [items, total] = await prisma.$transaction([
      prisma.medication.findMany({
        where,
        orderBy: { name: "asc" },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.medication.count({ where }),
    ]);
    return { items, total };
  }

  async listVaccines(filters: InventoryFilters): Promise<{ items: Vaccine[]; total: number }> {
    const where = vaccineWhere(filters);
    const [items, total] = await prisma.$transaction([
      prisma.vaccine.findMany({
        where,
        orderBy: { name: "asc" },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.vaccine.count({ where }),
    ]);
    return { items, total };
  }

  activeMedications(): Promise<Medication[]> {
    return prisma.medication.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }

  activeVaccines(): Promise<Vaccine[]> {
    return prisma.vaccine.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }

  findMedication(id: string): Promise<Medication | null> {
    return prisma.medication.findUnique({ where: { id } });
  }

  findVaccine(id: string): Promise<Vaccine | null> {
    return prisma.vaccine.findUnique({ where: { id } });
  }

  // El nombre es único sin distinguir mayúsculas: "Amoxicilina" y "amoxicilina" son el mismo producto.
  async medicationNameTaken(name: string, exceptId?: string): Promise<boolean> {
    const found = await prisma.medication.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(exceptId && { id: { not: exceptId } }),
      },
      select: { id: true },
    });
    return found !== null;
  }

  async vaccineNameTaken(name: string, exceptId?: string): Promise<boolean> {
    const found = await prisma.vaccine.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        ...(exceptId && { id: { not: exceptId } }),
      },
      select: { id: true },
    });
    return found !== null;
  }

  async createMedication(data: NewMedicationData): Promise<Medication> {
    try {
      return await prisma.medication.create({ data });
    } catch (error) {
      return nameConflict(error, "Ya existe un medicamento con ese nombre");
    }
  }

  // updateMany + lectura en vez de update: con el pooler de Supabase (puerto 6543) el update de Medication
  // cierra la conexión de forma intermitente (P1017); updateMany no.
  async updateMedication(id: string, data: InventoryChanges): Promise<Medication> {
    try {
      await prisma.medication.updateMany({ where: { id }, data });
      return await prisma.medication.findUniqueOrThrow({ where: { id } });
    } catch (error) {
      return nameConflict(error, "Ya existe un medicamento con ese nombre");
    }
  }

  async updateVaccine(id: string, data: InventoryChanges): Promise<Vaccine> {
    try {
      return await prisma.vaccine.update({ where: { id }, data });
    } catch (error) {
      return nameConflict(error, "Ya existe una vacuna con ese nombre");
    }
  }
}
