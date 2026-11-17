import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import {
  agendaQuerySchema,
  availabilityQuerySchema,
  cancelAppointmentRequestSchema,
  cancelByLinkRequestSchema,
  checkInRequestSchema,
  createAppointmentRequestSchema,
  listMyAppointmentsQuerySchema,
  manageTokenParamSchema,
  reassignAppointmentRequestSchema,
  rescheduleAppointmentRequestSchema,
} from "@/modules/appointments/dto/appointments.dto";
import type { AppointmentsController } from "@/modules/appointments/appointments.controller";
import { publicLinkRateLimiter } from "@/config/rate-limit";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";
import { uuidParamSchema } from "@/shared/schemas/fields";

export function createAppointmentsRouter(
  controller: AppointmentsController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const reception = [authenticate, authorize(Role.RECEPTIONIST)];
  const bookers = [authenticate, authorize(Role.OWNER, Role.RECEPTIONIST)];
  const agendaReaders = [
    authenticate,
    authorize(Role.RECEPTIONIST, Role.VETERINARIAN, Role.GROOMER),
  ];

  // Pública (D-51): solo franjas libres, sin datos de citas ni de pacientes.
  router.get(
    "/availability",
    validate({ query: availabilityQuerySchema }),
    controller.availability,
  );
  // RN-83: recepción escanea el QR del propietario y la cita queda confirmada.
  router.post(
    "/check-in",
    ...reception,
    validate({ body: checkInRequestSchema }),
    controller.checkIn,
  );
  router.get("/", ...agendaReaders, validate({ query: agendaQuerySchema }), controller.agenda);
  router.post(
    "/",
    ...bookers,
    validate({ body: createAppointmentRequestSchema }),
    controller.create,
  );
  router.put(
    "/:id/reschedule",
    ...bookers,
    validate({ params: uuidParamSchema, body: rescheduleAppointmentRequestSchema }),
    controller.reschedule,
  );
  router.put(
    "/:id/cancel",
    ...bookers,
    validate({ params: uuidParamSchema, body: cancelAppointmentRequestSchema }),
    controller.cancel,
  );
  router.put(
    "/:id/arrival",
    ...reception,
    validate({ params: uuidParamSchema }),
    controller.registerArrival,
  );
  router.put(
    "/:id/no-show",
    ...reception,
    validate({ params: uuidParamSchema }),
    controller.markNoShow,
  );
  router.put(
    "/:id/reassign",
    ...reception,
    validate({ params: uuidParamSchema, body: reassignAppointmentRequestSchema }),
    controller.reassign,
  );

  return router;
}

// Se monta en /public (D-65, RN-84): enlace personal de los correos, sin sesión y con límite de peticiones por IP.
export function createPublicAppointmentsRouter(controller: AppointmentsController): Router {
  const router = Router();
  const params = validate({ params: manageTokenParamSchema });

  router.get(
    "/appointments/manage/:token",
    publicLinkRateLimiter,
    params,
    controller.managedByLink,
  );
  router.post(
    "/appointments/manage/:token/cancel",
    publicLinkRateLimiter,
    validate({ params: manageTokenParamSchema, body: cancelByLinkRequestSchema }),
    controller.cancelByLink,
  );
  router.post(
    "/appointments/manage/:token/reschedule",
    publicLinkRateLimiter,
    validate({ params: manageTokenParamSchema, body: rescheduleAppointmentRequestSchema }),
    controller.rescheduleByLink,
  );

  return router;
}

export function createMyAppointmentsRouter(
  controller: AppointmentsController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/",
    authenticate,
    authorize(Role.OWNER),
    validate({ query: listMyAppointmentsQuerySchema }),
    controller.listMine,
  );
  router.get(
    "/:id/check-in",
    authenticate,
    authorize(Role.OWNER),
    validate({ params: uuidParamSchema }),
    controller.checkInCode,
  );

  return router;
}
