import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { createGroomingServiceRequestSchema } from "@/modules/grooming/dto/grooming.dto";
import type { GroomingController } from "@/modules/grooming/grooming.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";
import { uuidParamSchema } from "@/shared/schemas/fields";

// Se monta en la raíz de /api/v1: agrupa /grooming-services y /patients/{id}/grooming-services.
export function createGroomingRouter(
  controller: GroomingController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.post(
    "/grooming-services",
    authenticate,
    authorize(Role.GROOMER),
    validate({ body: createGroomingServiceRequestSchema }),
    controller.create,
  );
  router.get(
    "/patients/:id/grooming-services",
    authenticate,
    authorize(Role.RECEPTIONIST, Role.VETERINARIAN, Role.GROOMER),
    validate({ params: uuidParamSchema }),
    controller.listByPatient,
  );

  return router;
}

export function createMyGroomingRouter(
  controller: GroomingController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/:id/grooming-services",
    authenticate,
    authorize(Role.OWNER),
    validate({ params: uuidParamSchema }),
    controller.listByPatient,
  );

  return router;
}
