import { Router } from "express";
import type { HealthController } from "@/modules/health/health.controller";

// Público a propósito: lo consulta un monitor externo. No expone datos, solo si la base responde.
export function createHealthRouter(controller: HealthController): Router {
  const router = Router();
  router.get("/db", controller.database);
  return router;
}
