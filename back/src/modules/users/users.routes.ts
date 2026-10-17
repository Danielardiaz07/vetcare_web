import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import {
  createStaffUserRequestSchema,
  listStaffUsersQuerySchema,
  updateStaffUserRequestSchema,
} from "@/modules/users/dto/users.dto";
import type { UsersController } from "@/modules/users/users.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";
import { uuidParamSchema } from "@/shared/schemas/fields";

export function createUsersRouter(
  controller: UsersController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const admin = [authenticate, authorize(Role.ADMIN)];

  router.get("/me", authenticate, controller.me);

  router.post(
    "/",
    ...admin,
    validate({ body: createStaffUserRequestSchema }),
    controller.createStaff,
  );
  router.get("/", ...admin, validate({ query: listStaffUsersQuerySchema }), controller.listStaff);
  router.get("/:id", ...admin, validate({ params: uuidParamSchema }), controller.getStaff);
  router.patch(
    "/:id",
    ...admin,
    validate({ params: uuidParamSchema, body: updateStaffUserRequestSchema }),
    controller.updateStaff,
  );

  return router;
}
