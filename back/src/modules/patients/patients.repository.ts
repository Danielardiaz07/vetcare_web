import type { Patient, Prisma, Sex, Species } from "@prisma/client";
import { prisma } from "@/shared/prisma";

export interface PatientListFilters {
  ownerId?: string;
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
  create(data: NewPatientData): Promise<Patient> {
    return prisma.patient.create({ data });
  }

  findById(id: string): Promise<Patient | null> {
    return prisma.patient.findUnique({ where: { id } });
  }

  findOwnerState(ownerId: string): Promise<{ active: boolean } | null> {
    return prisma.owner.findUnique({ where: { id: ownerId }, select: { active: true } });
  }

  async findOwnerIdByUserId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { ownerId: true } });
    return user?.ownerId ?? null;
  }

  async list(filters: PatientListFilters): Promise<{ items: Patient[]; total: number }> {
    const where = this.whereOf(filters);
    const [items, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where,
        orderBy: { name: "asc" },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.patient.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.PatientUpdateInput): Promise<Patient> {
    return prisma.patient.update({ where: { id }, data });
  }

  private whereOf({ ownerId, species, q, active }: PatientListFilters): Prisma.PatientWhereInput {
    return {
      ...(ownerId && { ownerId }),
      ...(species && { species }),
      ...(active !== undefined && { active }),
      ...(q && { name: { contains: q, mode: "insensitive" } }),
    };
  }
}
