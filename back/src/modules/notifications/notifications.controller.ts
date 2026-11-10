import type { RequestHandler } from "express";
import type { ListNotificationsQueryDto } from "@/modules/notifications/dto/notifications.dto";
import type { NotificationsService } from "@/modules/notifications/notifications.service";

export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  list: RequestHandler = async (req, res) => {
    res.json(await this.service.list(req.query as unknown as ListNotificationsQueryDto));
  };

  run: RequestHandler = async (_req, res) => {
    res.json(await this.service.runDue());
  };
}
