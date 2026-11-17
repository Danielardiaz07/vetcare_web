import type { AppointmentType, AppointmentTypeSetting } from "@prisma/client";
import { prisma } from "@/shared/prisma";

export class AppointmentTypesRepository {
  list(): Promise<AppointmentTypeSetting[]> {
    return prisma.appointmentTypeSetting.findMany({ orderBy: { type: "asc" } });
  }

  find(type: AppointmentType): Promise<AppointmentTypeSetting | null> {
    return prisma.appointmentTypeSetting.findUnique({ where: { type } });
  }

  updateDuration(type: AppointmentType, durationMinutes: number): Promise<AppointmentTypeSetting> {
    return prisma.appointmentTypeSetting.update({ where: { type }, data: { durationMinutes } });
  }
}
