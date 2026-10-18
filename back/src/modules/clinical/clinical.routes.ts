import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import {
  createConsultationRequestSchema,
  createVaccinationRequestSchema,
  createVaccineRequestSchema,
  historyQuerySchema,
} from "@/modules/clinical/dto/clinical.dto";
import type { ClinicalController } from "@/modules/clinical/clinical.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";
import { uuidParamSchema } from "@/shared/schemas/fields";

// Se monta en la raíz de /api/v1: agrupa /consultations, /vaccines, /vaccinations y /patients/{id}/....
export function createClinicalRouter(
  controller: ClinicalController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const veterinarian = [authenticate, authorize(Role.VETERINARIAN)];
  const clinicStaff = [authenticate, authorize(Role.RECEPTIONIST, Role.VETERINARIAN)];

  router.post(
    "/consultations",
    ...veterinarian,
    validate({ body: createConsultationRequestSchema }),
    controller.createConsultation,
  );
  router.get("/vaccines", authenticate, controller.listVaccines);
  router.post(
    "/vaccines",
    authenticate,
    authorize(Role.ADMIN),
    validate({ body: createVaccineRequestSchema }),
    controller.createVaccine,
  );
  router.post(
    "/vaccinations",
    ...veterinarian,
    validate({ body: createVaccinationRequestSchema }),
    controller.createVaccination,
  );
  router.get(
    "/patients/:id/history",
    ...clinicStaff,
    validate({ params: uuidParamSchema, query: historyQuerySchema }),
    controller.history,
  );
  router.get(
    "/patients/:id/vaccination-card",
    ...clinicStaff,
    validate({ params: uuidParamSchema }),
    controller.vaccinationCard,
  );

  return router;
}

export function createMyClinicalRouter(
  controller: ClinicalController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const owner = [authenticate, authorize(Role.OWNER)];

  router.get(
    "/:id/history",
    ...owner,
    validate({ params: uuidParamSchema, query: historyQuerySchema }),
    controller.history,
  );
  router.get(
    "/:id/vaccination-card",
    ...owner,
    validate({ params: uuidParamSchema }),
    controller.vaccinationCard,
  );

  return router;
}
