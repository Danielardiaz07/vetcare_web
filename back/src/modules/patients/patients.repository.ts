import type { Prisma, Sex, Species } from "@prisma/client";
import { prisma } from "@/shared/prisma";

// Los listados del panel muestran al propietario de cada mascota sin otra consulta.
const patientInclude = {
  owner: { select: { id: true, firstNames: true, lastNames: true, documentNumber: true } },
} satisfies Prisma.PatientInclude;

export type PatientRecord = Prisma.PatientGetPayload<{ include: typeof patientInclude }>;

export interface PatientListFilters {
  ownerId?: string;
  ownerDocument?: string;
  species?: Species;
  q?: string;
  active?: boolean;
  skip: number;
  take: number;
}

export interface NewPatientData {
  ownerId: string;
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  birthDate: Date;
  weightKg: number;
}

export class PatientsRepository {
  create(data: NewPatientData): Promise<PatientRecord> {
    return prisma.patient.create({ data, include: patientInclude });
  }

  findById(id: string): Promise<PatientRecord | null> {
    return prisma.patient.findUnique({ where: { id }, include: patientInclude });
  }

  findOwnerState(ownerId: string): Promise<{ active: boolean } | null> {
    return prisma.owner.findUnique({ where: { id: ownerId }, select: { active: true } });
  }

  async findOwnerIdByUserId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { ownerId: true } });
    return user?.ownerId ?? null;
  }

  async list(filters: PatientListFilters): Promise<{ items: PatientRecord[]; total: number }> {
    const where = this.whereOf(filters);
    const [items, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where,
        orderBy: { name: "asc" },
        skip: filters.skip,
        take: filters.take,
        include: patientInclude,
      }),
      prisma.patient.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.PatientUpdateInput): Promise<PatientRecord> {
    return prisma.patient.update({ where: { id }, data, include: patientInclude });
  }

  private whereOf({
    ownerId,
    ownerDocument,
    species,
    q,
    active,
  }: PatientListFilters): Prisma.PatientWhereInput {
    return {
      ...(ownerId && { ownerId }),
      ...(ownerDocument && { owner: { documentNumber: ownerDocument } }),
      ...(species && { species }),
      ...(active !== undefined && { active }),
      ...(q && { name: { contains: q, mode: "insensitive" } }),
    };
  }
}
