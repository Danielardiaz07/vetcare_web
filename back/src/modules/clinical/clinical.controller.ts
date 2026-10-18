import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type {
  CreateConsultationRequestDto,
  CreateVaccinationRequestDto,
  CreateVaccineRequestDto,
  HistoryQueryDto,
} from "@/modules/clinical/dto/clinical.dto";
import type { ClinicalService } from "@/modules/clinical/clinical.service";

export class ClinicalController {
  constructor(private readonly service: ClinicalService) {}

  createConsultation: RequestHandler = async (req, res) => {
    const consultation = await this.service.createConsultation(
      req.user!,
      req.body as CreateConsultationRequestDto,
    );
    res.status(HttpStatus.CREATED).json(consultation);
  };

  listVaccines: RequestHandler = async (_req, res) => {
    res.json(await this.service.listVaccines());
  };

  createVaccine: RequestHandler = async (req, res) => {
    res
      .status(HttpStatus.CREATED)
      .json(await this.service.createVaccine(req.body as CreateVaccineRequestDto));
  };

  createVaccination: RequestHandler = async (req, res) => {
    const vaccination = await this.service.createVaccination(
      req.user!,
      req.body as CreateVaccinationRequestDto,
    );
    res.status(HttpStatus.CREATED).json(vaccination);
  };

  history: RequestHandler = async (req, res) => {
    res.json(
      await this.service.history(
        req.user!,
        String(req.params.id),
        req.query as unknown as HistoryQueryDto,
      ),
    );
  };

  vaccinationCard: RequestHandler = async (req, res) => {
    res.json(await this.service.vaccinationCard(req.user!, String(req.params.id)));
  };
}
