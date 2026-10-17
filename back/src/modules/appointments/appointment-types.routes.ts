import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import {
  appointmentTypeParamSchema,
  updateAppointmentTypeRequestSchema,
} from "@/modules/appointments/dto/appointment-types.dto";
import type { AppointmentTypesController } from "@/modules/appointments/appointment-types.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";

export function createAppointmentTypesRouter(
  controller: AppointmentTypesController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.get("/", authenticate, controller.list);
  router.patch(
    "/:type",
    authenticate,
    authorize(Role.ADMIN),
    validate({ params: appointmentTypeParamSchema, body: updateAppointmentTypeRequestSchema }),
    controller.update,
  );

  return router;
}
