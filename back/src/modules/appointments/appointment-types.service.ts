import { AppointmentType, type AppointmentTypeSetting } from "@prisma/client";
import type { AppointmentTypeResponseDto } from "@/modules/appointments/dto/appointment-types.dto";
import type { AppointmentTypesRepository } from "@/modules/appointments/appointment-types.repository";
import { NotFoundError } from "@/shared/errors";

// D-21: la estética la atiende un estilista; el resto, un veterinario.
export const professionalFor = (type: AppointmentType): "VETERINARIAN" | "GROOMER" =>
  type === AppointmentType.GROOMING ? "GROOMER" : "VETERINARIAN";

const toResponse = (setting: AppointmentTypeSetting): AppointmentTypeResponseDto => ({
  type: setting.type,
  durationMinutes: setting.durationMinutes,
  professional: professionalFor(setting.type),
});

export class AppointmentTypesService {
  constructor(private readonly repository: AppointmentTypesRepository) {}

  async list(): Promise<AppointmentTypeResponseDto[]> {
    return (await this.repository.list()).map(toResponse);
  }

  async updateDuration(
    type: AppointmentType,
    durationMinutes: number,
  ): Promise<AppointmentTypeResponseDto> {
    if (!(await this.repository.find(type))) throw new NotFoundError("Tipo de cita no encontrado");
    return toResponse(await this.repository.updateDuration(type, durationMinutes));
  }
}
