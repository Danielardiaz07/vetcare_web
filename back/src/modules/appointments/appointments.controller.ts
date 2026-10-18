import type { RequestHandler } from "express";
import { HttpStatus } from "@/config/constants";
import type {
  AgendaQueryDto,
  AvailabilityQueryDto,
  CancelAppointmentRequestDto,
  CreateAppointmentRequestDto,
  ListMyAppointmentsQueryDto,
  ReassignAppointmentRequestDto,
  RescheduleAppointmentRequestDto,
} from "@/modules/appointments/dto/appointments.dto";
import type { AppointmentsService } from "@/modules/appointments/appointments.service";

export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  availability: RequestHandler = async (req, res) => {
    res.json(await this.service.availability(req.query as unknown as AvailabilityQueryDto));
  };

  create: RequestHandler = async (req, res) => {
    const appointment = await this.service.create(
      req.user!,
      req.body as CreateAppointmentRequestDto,
    );
    res.status(HttpStatus.CREATED).json(appointment);
  };

  agenda: RequestHandler = async (req, res) => {
    res.json(await this.service.agenda(req.user!, req.query as unknown as AgendaQueryDto));
  };

  reschedule: RequestHandler = async (req, res) => {
    res.json(
      await this.service.reschedule(
        req.user!,
        String(req.params.id),
        req.body as RescheduleAppointmentRequestDto,
      ),
    );
  };

  cancel: RequestHandler = async (req, res) => {
    res.json(
      await this.service.cancel(
        req.user!,
        String(req.params.id),
        req.body as CancelAppointmentRequestDto,
      ),
    );
  };

  registerArrival: RequestHandler = async (req, res) => {
    res.json(await this.service.registerArrival(String(req.params.id)));
  };

  markNoShow: RequestHandler = async (req, res) => {
    res.json(await this.service.markNoShow(String(req.params.id)));
  };

  reassign: RequestHandler = async (req, res) => {
    res.json(
      await this.service.reassign(String(req.params.id), req.body as ReassignAppointmentRequestDto),
    );
  };

  listMine: RequestHandler = async (req, res) => {
    res.json(
      await this.service.listMine(req.user!.id, req.query as unknown as ListMyAppointmentsQueryDto),
    );
  };
}
