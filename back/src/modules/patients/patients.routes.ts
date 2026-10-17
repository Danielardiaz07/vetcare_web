import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import {
  createPatientRequestSchema,
  listMyPatientsQuerySchema,
  listPatientsQuerySchema,
  updatePatientRequestSchema,
} from "@/modules/patients/dto/patients.dto";
import type { PatientsController } from "@/modules/patients/patients.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";
import { uuidParamSchema } from "@/shared/schemas/fields";

export function createPatientsRouter(
  controller: PatientsController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const staff = [authenticate, authorize(Role.RECEPTIONIST, Role.VETERINARIAN)];

  router.post("/", ...staff, validate({ body: createPatientRequestSchema }), controller.create);
  router.get("/", ...staff, validate({ query: listPatientsQuerySchema }), controller.list);
  router.get("/:id", ...staff, validate({ params: uuidParamSchema }), controller.getById);
  router.patch(
    "/:id",
    ...staff,
    validate({ params: uuidParamSchema, body: updatePatientRequestSchema }),
    controller.update,
  );
  router.delete("/:id", ...staff, validate({ params: uuidParamSchema }), controller.deactivate);

  return router;
}

export function createMyPatientsRouter(
  controller: PatientsController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const owner = [authenticate, authorize(Role.OWNER)];

  router.get("/", ...owner, validate({ query: listMyPatientsQuerySchema }), controller.listMine);
  router.get("/:id", ...owner, validate({ params: uuidParamSchema }), controller.getMine);

  return router;
}
