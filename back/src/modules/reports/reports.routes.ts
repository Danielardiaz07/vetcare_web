import { Role } from "@prisma/client";
import { Router, type RequestHandler } from "express";
import { dashboardQuerySchema } from "@/modules/reports/dto/reports.dto";
import type { ReportsController } from "@/modules/reports/reports.controller";
import { authorize } from "@/shared/middlewares/authorize";
import { validate } from "@/shared/middlewares/validate";

export function createReportsRouter(
  controller: ReportsController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.get(
    "/dashboard",
    authenticate,
    authorize(Role.ADMIN),
    validate({ query: dashboardQuerySchema }),
    controller.dashboard,
  );

  return router;
}
