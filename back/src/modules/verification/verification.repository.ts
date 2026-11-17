import type { Species } from "@prisma/client";
import { prisma } from "@/shared/prisma";

export interface PatientRef {
  id: string;
  ownerId: string;
  active: boolean;
}

export interface CardLinkRecord {
  token: string;
  active: boolean;
}

export interface CardByTokenRecord {
  active: boolean;
  patient: { id: string; name: string; species: Species; active: boolean };
}

export interface LatestDoseRecord {
  appliedAt: Date;
  nextDoseAt: Date | null;
  vaccine: { name: string };
}

const linkSelect = { token: true, active: true } as const;

export class VerificationRepository {
  findPatient(id: string): Promise<PatientRef | null> {
    return prisma.patient.findUnique({
      where: { id },
      select: { id: true, ownerId: true, active: true },
    });
  }

  async findOwnerIdByUserId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { ownerId: true } });
    return user?.ownerId ?? null;
  }

  // Crea el enlace si no existe; si ya existe lo deja como está (dos pedidos a la vez no chocan por el índice único).
  ensureLink(patientId: string, token: string): Promise<CardLinkRecord> {
    return prisma.cardVerification.upsert({
      where: { patientId },
      create: { patientId, token },
      update: {},
      select: linkSelect,
    });
  }

  // Cambia el token y reactiva el enlace: el QR anterior deja de servir.
  rotateLink(patientId: string, token: string, now: Date): Promise<CardLinkRecord> {
    return prisma.cardVerification.upsert({
      where: { patientId },
      create: { patientId, token },
      update: { token, active: true, rotatedAt: now },
      select: linkSelect,
    });
  }

  async deactivateLink(patientId: string): Promise<void> {
    await prisma.cardVerification.updateMany({ where: { patientId }, data: { active: false } });
  }

  findByToken(token: string): Promise<CardByTokenRecord | null> {
    return prisma.cardVerification.findUnique({
      where: { token },
      select: {
        active: true,
        patient: { select: { id: true, name: true, species: true, active: true } },
      },
    });
  }

  // Última dosis de cada vacuna de la mascota (RN-49).
  latestDoses(patientId: string): Promise<LatestDoseRecord[]> {
    return prisma.vaccination.findMany({
      where: { patientId },
      distinct: ["vaccineId"],
      orderBy: [{ vaccineId: "asc" }, { appliedAt: "desc" }, { createdAt: "desc" }],
      select: { appliedAt: true, nextDoseAt: true, vaccine: { select: { name: true } } },
    });
  }
}
