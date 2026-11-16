import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import type { AlertsController } from "@/modules/notifications/alerts.controller";
import { authorize } from "@/shared/middlewares/authorize";

export function createMyAlertsRouter(
  controller: AlertsController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.get("/", authenticate, authorize(Role.OWNER), controller.listMine);

  return router;
}
