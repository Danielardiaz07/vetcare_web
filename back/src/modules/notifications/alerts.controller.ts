import type { RequestHandler } from "express";
import type { AlertsService } from "@/modules/notifications/alerts.service";

export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  listMine: RequestHandler = async (req, res) => {
    res.json(await this.service.listMine(req.user!.id));
  };
}
