import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type { CreateGroomingServiceRequestDto } from "@/modules/grooming/dto/grooming.dto";
import type { GroomingService } from "@/modules/grooming/grooming.service";

export class GroomingController {
  constructor(private readonly service: GroomingService) {}

  create: RequestHandler = async (req, res) => {
    const record = await this.service.create(
      req.user!,
      req.body as CreateGroomingServiceRequestDto,
    );
    res.status(HttpStatus.CREATED).json(record);
  };

  listByPatient: RequestHandler = async (req, res) => {
    res.json(await this.service.listByPatient(req.user!, String(req.params.id)));
  };
}
