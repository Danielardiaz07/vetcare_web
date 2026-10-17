import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type {
  CreateStaffRequestDto,
  ListStaffQueryDto,
  ReplaceSchedulesRequestDto,
  UpdateStaffRequestDto,
} from "@/modules/staff/dto/staff.dto";
import type { StaffService } from "@/modules/staff/staff.service";

export class StaffController {
  constructor(private readonly service: StaffService) {}

  create: RequestHandler = async (req, res) => {
    const created = await this.service.create(req.body as CreateStaffRequestDto);
    res.status(HttpStatus.CREATED).json(created);
  };

  list: RequestHandler = async (req, res) => {
    res.json(await this.service.list(req.query as unknown as ListStaffQueryDto, req.user!.role));
  };

  getById: RequestHandler = async (req, res) => {
    res.json(await this.service.getById(String(req.params.id), req.user!.role));
  };

  update: RequestHandler = async (req, res) => {
    res.json(await this.service.update(String(req.params.id), req.body as UpdateStaffRequestDto));
  };

  getSchedules: RequestHandler = async (req, res) => {
    res.json({ schedules: await this.service.getSchedules(String(req.params.id)) });
  };

  replaceSchedules: RequestHandler = async (req, res) => {
    const schedules = await this.service.replaceSchedules(
      String(req.params.id),
      req.body as ReplaceSchedulesRequestDto,
    );
    res.json({ schedules });
  };
}
