import type { RequestHandler } from "express";
import { CHECK_IN_QR_EXTENSION, HttpStatus, QR_IMAGE_MAX_AGE_SECONDS } from "@/config/constants";
import type {
  AgendaQueryDto,
  AvailabilityQueryDto,
  CancelAppointmentRequestDto,
  CancelByLinkRequestDto,
  CheckInRequestDto,
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

  checkInCode: RequestHandler = async (req, res) => {
    res.json(await this.service.checkInCode(req.user!, String(req.params.id)));
  };

  managedByLink: RequestHandler = async (req, res) => {
    res.set("Cache-Control", "no-store"); // el estado de la cita cambia
    res.json(await this.service.managedByLink(String(req.params.token)));
  };

  cancelByLink: RequestHandler = async (req, res) => {
    res.json(
      await this.service.cancelByLink(String(req.params.token), req.body as CancelByLinkRequestDto),
    );
  };

  rescheduleByLink: RequestHandler = async (req, res) => {
    res.json(
      await this.service.rescheduleByLink(
        String(req.params.token),
        req.body as RescheduleAppointmentRequestDto,
      ),
    );
  };

  checkIn: RequestHandler = async (req, res) => {
    res.json(await this.service.checkIn((req.body as CheckInRequestDto).code));
  };

  scannerAccess: RequestHandler = async (_req, res) => {
    res.set("Cache-Control", "no-store"); // la respuesta lleva el token secreto
    res.json(await this.service.scannerAccess());
  };

  scannerStatus: RequestHandler = (req, res) => {
    this.service.assertScannerToken(String(req.params.scannerToken));
    res.set("Cache-Control", "no-store");
    res.status(HttpStatus.NO_CONTENT).end();
  };

  checkInFromScanner: RequestHandler = async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(
      await this.service.checkInFromScanner(
        String(req.params.scannerToken),
        (req.body as CheckInRequestDto).code,
      ),
    );
  };

  checkInQrImage: RequestHandler = async (req, res) => {
    const file = String(req.params.file);
    const code = file.endsWith(CHECK_IN_QR_EXTENSION)
      ? file.slice(0, -CHECK_IN_QR_EXTENSION.length)
      : file;
    const image = await this.service.checkInQrImage(code);
    res.set({
      "Content-Type": "image/png",
      "Cache-Control": `public, max-age=${QR_IMAGE_MAX_AGE_SECONDS}`,
    });
    res.send(image);
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
