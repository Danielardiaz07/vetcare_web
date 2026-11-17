import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { listNotificationsQuerySchema } from "@/modules/notifications/dto/notifications.dto";
import type { NotificationsController } from "@/modules/notifications/notifications.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";

export function createNotificationsRouter(
  controller: NotificationsController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  const admin = [authenticate, authorize(Role.ADMIN)];

  router.get("/", ...admin, validate({ query: listNotificationsQuerySchema }), controller.list);
  router.post("/run", ...admin, controller.run);

  return router;
}
