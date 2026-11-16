import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { cardTokenParamSchema } from "@/modules/verification/dto/verification.dto";
import type { VerificationController } from "@/modules/verification/verification.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";
import { uuidParamSchema } from "@/shared/schemas/fields";

const LINK_PATH = "/:id/vaccination-card/verification";

// Se monta en /public: sin sesión, solo el estado de las vacunas (RN-82).
export function createPublicVerificationRouter(controller: VerificationController): Router {
  const router = Router();

  router.get(
    "/vaccination-cards/:token",
    validate({ params: cardTokenParamSchema }),
    controller.getPublic,
  );

  return router;
}

// Se monta en /me/patients: el propietario gestiona el QR de sus mascotas.
export function createMyVerificationRouter(
  controller: VerificationController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const owner = [authenticate, authorize(Role.OWNER), validate({ params: uuidParamSchema })];

  router.get(LINK_PATH, ...owner, controller.getLink);
  router.post(`${LINK_PATH}/rotate`, ...owner, controller.rotate);
  router.delete(LINK_PATH, ...owner, controller.disable);

  return router;
}

// Se monta en /patients: recepción y veterinario obtienen el QR para imprimir el carné.
export function createStaffVerificationRouter(
  controller: VerificationController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.get(
    LINK_PATH,
    authenticate,
    authorize(Role.RECEPTIONIST, Role.VETERINARIAN),
    validate({ params: uuidParamSchema }),
    controller.getLink,
  );

  return router;
}
