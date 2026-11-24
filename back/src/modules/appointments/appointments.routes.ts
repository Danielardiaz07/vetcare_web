import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import {
  agendaQuerySchema,
  availabilityQuerySchema,
  cancelAppointmentRequestSchema,
  cancelByLinkRequestSchema,
  checkInQrParamSchema,
  checkInRequestSchema,
  createAppointmentRequestSchema,
  listMyAppointmentsQuerySchema,
  manageTokenParamSchema,
  reassignAppointmentRequestSchema,
  rescheduleAppointmentRequestSchema,
  scannerTokenParamSchema,
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
  // D-69: canal de eventos de la agenda; autenticado con el JWT en Authorization, solo recepción.
  router.get("/events", ...reception, controller.events);
  // D-68, RN-85: enlace y QR fijo del escáner, solo para recepción.
  router.get("/check-in/scanner-access", ...reception, controller.scannerAccess);
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
  // D-73: el veterinario asignado inicia la atención.
  router.put(
    "/:id/start-attention",
    authenticate,
    authorize(Role.VETERINARIAN),
    validate({ params: uuidParamSchema }),
    controller.startAttention,
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
  // D-66, RN-85: página de escaneo de recepción. Entra con el token del enlace, sin sesión.
  router.get(
    "/check-in/:scannerToken",
    publicLinkRateLimiter,
    validate({ params: scannerTokenParamSchema }),
    controller.scannerStatus,
  );
  router.post(
    "/check-in/:scannerToken",
    publicLinkRateLimiter,
    validate({ params: scannerTokenParamSchema, body: checkInRequestSchema }),
    controller.checkInFromScanner,
  );
  // D-66: imagen PNG del QR de llegada, para el correo de recordatorio.
  router.get(
    "/check-in-qr/:file",
    publicLinkRateLimiter,
    validate({ params: checkInQrParamSchema }),
    controller.checkInQrImage,
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
