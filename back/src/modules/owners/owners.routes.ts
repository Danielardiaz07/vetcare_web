import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import {
  createOwnerRequestSchema,
  listOwnersQuerySchema,
  updateOwnerRequestSchema,
} from "@/modules/owners/dto/owners.dto";
import type { OwnersController } from "@/modules/owners/owners.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";
import { uuidParamSchema } from "@/shared/schemas/fields";

export function createOwnersRouter(
  controller: OwnersController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const staff = [authenticate, authorize(Role.RECEPTIONIST, Role.ADMIN)];

  router.post("/", ...staff, validate({ body: createOwnerRequestSchema }), controller.create);
  router.get("/", ...staff, validate({ query: listOwnersQuerySchema }), controller.list);
  router.get("/:id", ...staff, validate({ params: uuidParamSchema }), controller.getById);
  router.patch(
    "/:id",
    ...staff,
    validate({ params: uuidParamSchema, body: updateOwnerRequestSchema }),
    controller.update,
  );
  router.delete("/:id", ...staff, validate({ params: uuidParamSchema }), controller.deactivate);

  return router;
}
