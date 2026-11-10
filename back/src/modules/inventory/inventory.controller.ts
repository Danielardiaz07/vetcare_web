import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type {
  CreateMedicationRequestDto,
  ListInventoryQueryDto,
  UpdateMedicationRequestDto,
  UpdateVaccineRequestDto,
} from "@/modules/inventory/dto/inventory.dto";
import type { InventoryService } from "@/modules/inventory/inventory.service";

export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  listMedications: RequestHandler = async (req, res) => {
    res.json(await this.service.listMedications(req.query as unknown as ListInventoryQueryDto));
  };

  createMedication: RequestHandler = async (req, res) => {
    const medication = await this.service.createMedication(req.body as CreateMedicationRequestDto);
    res.status(HttpStatus.CREATED).json(medication);
  };

  updateMedication: RequestHandler = async (req, res) => {
    res.json(
      await this.service.updateMedication(
        String(req.params.id),
        req.body as UpdateMedicationRequestDto,
      ),
    );
  };

  listVaccines: RequestHandler = async (req, res) => {
    res.json(await this.service.listVaccines(req.query as unknown as ListInventoryQueryDto));
  };

  updateVaccine: RequestHandler = async (req, res) => {
    res.json(
      await this.service.updateVaccine(String(req.params.id), req.body as UpdateVaccineRequestDto),
    );
  };

  alerts: RequestHandler = async (_req, res) => {
    res.json(await this.service.alerts());
  };
}
