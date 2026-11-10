import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import {
  createMedicationRequestSchema,
  listInventoryQuerySchema,
  updateMedicationRequestSchema,
  updateVaccineRequestSchema,
} from "@/modules/inventory/dto/inventory.dto";
import type { InventoryController } from "@/modules/inventory/inventory.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";
import { uuidParamSchema } from "@/shared/schemas/fields";

// RF-22: el inventario lo gestiona solo el administrador.
export function createInventoryRouter(
  controller: InventoryController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const admin = [authenticate, authorize(Role.ADMIN)];

  router.get("/alerts", ...admin, controller.alerts);

  router.get(
    "/medications",
    ...admin,
    validate({ query: listInventoryQuerySchema }),
    controller.listMedications,
  );
  router.post(
    "/medications",
    ...admin,
    validate({ body: createMedicationRequestSchema }),
    controller.createMedication,
  );
  router.patch(
    "/medications/:id",
    ...admin,
    validate({ params: uuidParamSchema, body: updateMedicationRequestSchema }),
    controller.updateMedication,
  );

  router.get(
    "/vaccines",
    ...admin,
    validate({ query: listInventoryQuerySchema }),
    controller.listVaccines,
  );
  router.patch(
    "/vaccines/:id",
    ...admin,
    validate({ params: uuidParamSchema, body: updateVaccineRequestSchema }),
    controller.updateVaccine,
  );

  return router;
}
