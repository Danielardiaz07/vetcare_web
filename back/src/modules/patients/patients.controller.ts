import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type {
  CreatePatientRequestDto,
  ListMyPatientsQueryDto,
  ListPatientsQueryDto,
  UpdatePatientRequestDto,
} from "@/modules/patients/dto/patients.dto";
import type { PatientsService } from "@/modules/patients/patients.service";

export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  create: RequestHandler = async (req, res) => {
    const patient = await this.service.create(req.body as CreatePatientRequestDto);
    res.status(HttpStatus.CREATED).json(patient);
  };

  list: RequestHandler = async (req, res) => {
    res.json(await this.service.list(req.query as unknown as ListPatientsQueryDto));
  };

  getById: RequestHandler = async (req, res) => {
    res.json(await this.service.getById(String(req.params.id)));
  };

  update: RequestHandler = async (req, res) => {
    res.json(await this.service.update(String(req.params.id), req.body as UpdatePatientRequestDto));
  };

  deactivate: RequestHandler = async (req, res) => {
    await this.service.deactivate(String(req.params.id));
    res.status(HttpStatus.NO_CONTENT).send();
  };

  listMine: RequestHandler = async (req, res) => {
    res.json(
      await this.service.listMine(req.user!.id, req.query as unknown as ListMyPatientsQueryDto),
    );
  };

  getMine: RequestHandler = async (req, res) => {
    res.json(await this.service.getMine(req.user!.id, String(req.params.id)));
  };
}
