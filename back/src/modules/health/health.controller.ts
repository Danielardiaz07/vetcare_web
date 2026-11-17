import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type { HealthService } from "@/modules/health/health.service";

export class HealthController {
  constructor(private readonly service: HealthService) {}

  database: RequestHandler = async (_req, res) => {
    const health = await this.service.checkDatabase();
    res
      .status(health.status === "ok" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .set("Cache-Control", "no-store")
      .json(health);
  };
}
