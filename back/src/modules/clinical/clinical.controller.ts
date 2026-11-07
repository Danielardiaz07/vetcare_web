import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type {
  CreateConsultationRequestDto,
  CreateHospitalizationRequestDto,
  CreateLabExamRequestDto,
  CreateSurgeryRequestDto,
  CreateVaccinationRequestDto,
  CreateVaccineRequestDto,
  DischargeHospitalizationRequestDto,
  HistoryQueryDto,
  ListHospitalizationsQueryDto,
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

  createSurgery: RequestHandler = async (req, res) => {
    const surgery = await this.service.createSurgery(
      req.user!,
      req.body as CreateSurgeryRequestDto,
    );
    res.status(HttpStatus.CREATED).json(surgery);
  };

  createLabExam: RequestHandler = async (req, res) => {
    const exam = await this.service.createLabExam(req.user!, req.body as CreateLabExamRequestDto);
    res.status(HttpStatus.CREATED).json(exam);
  };

  admit: RequestHandler = async (req, res) => {
    const hospitalization = await this.service.admit(
      req.user!,
      req.body as CreateHospitalizationRequestDto,
    );
    res.status(HttpStatus.CREATED).json(hospitalization);
  };

  discharge: RequestHandler = async (req, res) => {
    res.json(
      await this.service.discharge(
        req.user!,
        String(req.params.id),
        req.body as DischargeHospitalizationRequestDto,
      ),
    );
  };

  listHospitalizations: RequestHandler = async (req, res) => {
    res.json(
      await this.service.listHospitalizations(req.query as unknown as ListHospitalizationsQueryDto),
    );
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
