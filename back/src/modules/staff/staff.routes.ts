import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import type { ZodType } from "zod";
import { listStaffQuerySchema, replaceSchedulesRequestSchema } from "@/modules/staff/dto/staff.dto";
import type { StaffController } from "@/modules/staff/staff.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";
import { uuidParamSchema } from "@/shared/schemas/fields";

interface StaffRouterOptions {
  controller: StaffController;
  authenticate: RequestHandler;
  createSchema: ZodType;
  updateSchema: ZodType;
}

// Se monta dos veces: /veterinarians y /groomers comparten forma y permisos.
export function createStaffRouter({
  controller,
  authenticate,
  createSchema,
  updateSchema,
}: StaffRouterOptions): Router {
  const router = Router();
  const admin = [authenticate, authorize(Role.ADMIN)];

  router.post("/", ...admin, validate({ body: createSchema }), controller.create);
  router.get("/", authenticate, validate({ query: listStaffQuerySchema }), controller.list);
  router.get("/:id", authenticate, validate({ params: uuidParamSchema }), controller.getById);
  router.patch(
    "/:id",
    ...admin,
    validate({ params: uuidParamSchema, body: updateSchema }),
    controller.update,
  );
  router.get(
    "/:id/schedules",
    authenticate,
    validate({ params: uuidParamSchema }),
    controller.getSchedules,
  );
  router.put(
    "/:id/schedules",
    ...admin,
    validate({ params: uuidParamSchema, body: replaceSchedulesRequestSchema }),
    controller.replaceSchedules,
  );

  return router;
}
