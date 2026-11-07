import type { RequestHandler } from "express";
import type { DashboardQueryDto } from "@/modules/reports/dto/reports.dto";
import type { ReportsService } from "@/modules/reports/reports.service";

export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  dashboard: RequestHandler = async (req, res) => {
    res.json(await this.service.dashboard(req.query as unknown as DashboardQueryDto));
  };
}
