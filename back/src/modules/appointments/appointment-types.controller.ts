import type { AppointmentType } from "@prisma/client";
import type { RequestHandler } from "express";
import type { UpdateAppointmentTypeRequestDto } from "@/modules/appointments/dto/appointment-types.dto";
import type { AppointmentTypesService } from "@/modules/appointments/appointment-types.service";

export class AppointmentTypesController {
  constructor(private readonly service: AppointmentTypesService) {}

  list: RequestHandler = async (_req, res) => {
    res.json({ data: await this.service.list() });
  };

  update: RequestHandler = async (req, res) => {
    const { durationMinutes } = req.body as UpdateAppointmentTypeRequestDto;
    res.json(
      await this.service.updateDuration(req.params.type as AppointmentType, durationMinutes),
    );
  };
}
