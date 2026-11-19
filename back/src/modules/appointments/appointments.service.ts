import { AppointmentStatus, Role, type AppointmentType } from "@prisma/client";
import {
  MAX_ACTIVE_APPOINTMENTS_PER_PATIENT,
  MAX_APPOINTMENT_ADVANCE_DAYS,
  MIN_APPOINTMENT_LEAD_HOURS,
  NO_SHOW_GRACE_MINUTES,
  SLOT_MINUTES,
  SUGGESTED_DATES_COUNT,
} from "@/config/constants";
import type {
  AgendaQueryDto,
  AppointmentResponseDto,
  AvailabilityQueryDto,
  AvailabilityResponseDto,
  CancelAppointmentRequestDto,
  CancelByLinkRequestDto,
  CheckInCodeResponseDto,
  CheckInScanResultDto,
  CreateAppointmentRequestDto,
  LinkedClinicalRecordDto,
  ListMyAppointmentsQueryDto,
  ManagedAppointmentDto,
  ReassignAppointmentRequestDto,
  RescheduleAppointmentRequestDto,
  ScannerAccessResponseDto,
} from "@/modules/appointments/dto/appointments.dto";
import type {
  AppointmentChangeListener,
  IAppointmentEvents,
} from "@/modules/appointments/appointment-events.interface";
import type { IAppointmentNotifier } from "@/modules/appointments/appointment-notifier.interface";
import {
  ACTIVE_STATUSES,
  SlotTakenError,
  type AppointmentRecord,
  type AppointmentsRepository,
  type BusyRecord,
  type ProfessionalKind,
  type ProfessionalRecord,
} from "@/modules/appointments/appointments.repository";
import { professionalFor } from "@/modules/appointments/appointment-types.service";
import type { AppointmentTypesRepository } from "@/modules/appointments/appointment-types.repository";
import type { CheckInCodes, ManageLinks } from "@/modules/appointments/check-in-codes";
import type { CheckInScanner } from "@/modules/appointments/check-in-scanner";
import { isProcedure, PROCEDURE_RECEPTION_ONLY_MESSAGE } from "@/modules/appointments/procedures";
import { overlapsBusy, scheduleCovers, slotsOfDay } from "@/modules/appointments/slots";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors";
import {
  addDays,
  addMinutes,
  clinicDateOf,
  clinicInstant,
  daysBetween,
  minutesBetween,
} from "@/shared/utils/clinic-time";
import { paginate, skipOf, type Paginated } from "@/shared/utils/pagination";
import { toQrPng, toQrSvg } from "@/shared/utils/qr";

export interface Actor {
  id: string;
  role: Role;
}

const SLOT_TAKEN_MESSAGE = "La franja ya no esta disponible"; // RN-27
const LINK_NOT_FOUND_MESSAGE = "Enlace no valido";
const CANCEL_BY_LINK_REASON = "Cancelada por el propietario desde el enlace del correo";
const CONTACT_CLINIC_MESSAGE = "Comunicate con la clinica"; // RN-28
const HOUR_MINUTES = 60;
const DAY_HOURS = 24;

const professionalOf = (record: AppointmentRecord) => record.veterinarian ?? record.groomer;
const kindOf = (record: AppointmentRecord): ProfessionalKind => professionalFor(record.type);

// D-71: a lo sumo un registro clínico por cita (cada uno es único por cita).
function linkedRecordOf(record: AppointmentRecord): LinkedClinicalRecordDto | null {
  if (record.consultation) return { kind: "CONSULTATION", id: record.consultation.id };
  if (record.grooming) return { kind: "GROOMING", id: record.grooming.id };
  if (record.surgery) return { kind: "SURGERY", id: record.surgery.id };
  if (record.labExam) {
    return { kind: "LAB_EXAM", id: record.labExam.id, status: record.labExam.status };
  }
  return null;
}

function toResponse(record: AppointmentRecord, withOwner: boolean): AppointmentResponseDto {
  const professional = professionalOf(record);
  if (!professional) throw new Error(`La cita ${record.id} no tiene profesional`);
  return {
    id: record.id,
    type: record.type,
    status: record.status,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    durationMinutes: minutesBetween(record.startsAt, record.endsAt),
    reason: record.reason,
    cancelReason: record.cancelReason,
    procedureName: record.procedureName,
    instructions: record.instructions,
    clinicalRecord: linkedRecordOf(record),
    attentionStartedAt: record.attentionStartedAt,
    patient: { id: record.patient.id, name: record.patient.name },
    professional: {
      id: professional.id,
      firstNames: professional.firstNames,
      lastNames: professional.lastNames,
    },
    ...(withOwner && { owner: record.patient.owner }),
  };
}

export class AppointmentsService {
  constructor(
    private readonly repository: AppointmentsRepository,
    private readonly types: AppointmentTypesRepository,
    private readonly notifier: IAppointmentNotifier,
    private readonly events: IAppointmentEvents,
    private readonly checkInCodes: CheckInCodes,
    private readonly manageLinks: ManageLinks,
    private readonly scanner: CheckInScanner,
    private readonly frontendUrl: string | undefined,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async availability(query: AvailabilityQueryDto): Promise<AvailabilityResponseDto> {
    const kind = professionalFor(query.type);
    const durationMinutes = await this.durationFor(query.type, query.durationMinutes);
    const professionals = await this.repository.findProfessionals(kind, query.professionalId);
    if (query.professionalId && professionals.length === 0) {
      throw new NotFoundError("Profesional no encontrado");
    }

    const window = this.bookingWindow();
    const firstDate = clinicDateOf(window.from);
    const lastDate = clinicDateOf(window.to);
    const busy =
      professionals.length > 0
        ? await this.repository.findBusy(
            kind,
            professionals.map((professional) => professional.id),
            clinicInstant(firstDate, 0),
            clinicInstant(addDays(lastDate, 1), 0),
          )
        : [];

    const offersOn = (date: string) =>
      slotsOfDay(date, professionals, busy, durationMinutes, window);
    const slots = offersOn(query.date).map((offer) => ({
      startsAt: offer.startsAt,
      endsAt: offer.endsAt,
      professionals: offer.professionals.map(({ id, firstNames, lastNames }) => ({
        id,
        firstNames,
        lastNames,
      })),
    }));

    return {
      date: query.date,
      durationMinutes,
      slots,
      suggestedDates:
        slots.length > 0 ? [] : this.nearestDates(query.date, firstDate, lastDate, offersOn),
    };
  }

  async create(actor: Actor, dto: CreateAppointmentRequestDto): Promise<AppointmentResponseDto> {
    const patient = await this.repository.findPatient(dto.patientId);
    if (!patient) throw new NotFoundError("Paciente no encontrado");
    await this.assertCanAccessOwner(actor, patient.ownerId);
    if (!patient.active) throw new ConflictError("El paciente esta desactivado");
    if (isProcedure(dto.type) && actor.role !== Role.RECEPTIONIST) {
      throw new ForbiddenError(PROCEDURE_RECEPTION_ONLY_MESSAGE); // D-71
    }

    const durationMinutes = await this.durationFor(dto.type, dto.durationMinutes);
    const endsAt = addMinutes(dto.startsAt, durationMinutes);
    this.assertBookable(dto.startsAt);

    // RN-24 frena que un propietario acapare franjas; las cirugías y exámenes los agenda recepción y no cuentan.
    const activeCount = isProcedure(dto.type)
      ? 0
      : await this.repository.countActiveFuture(patient.id, this.clock());
    if (activeCount >= MAX_ACTIVE_APPOINTMENTS_PER_PATIENT) {
      throw new ConflictError(
        `Esta mascota ya tiene ${MAX_ACTIVE_APPOINTMENTS_PER_PATIENT} citas activas`,
      );
    }

    const kind = professionalFor(dto.type);
    const candidates = await this.freeCandidates(kind, dto.startsAt, endsAt, dto.professionalId);

    for (const candidate of candidates) {
      try {
        const created = await this.repository.create({
          patientId: patient.id,
          type: dto.type,
          kind,
          professionalId: candidate.id,
          startsAt: dto.startsAt,
          endsAt,
          reason: dto.reason,
          procedureName: dto.procedureName,
          instructions: dto.instructions,
        });
        this.events.appointmentChanged(created.id);
        await this.notifier.appointmentEvent("CONFIRMED", created.id); // RN-35
        return toResponse(created, actor.role !== Role.OWNER);
      } catch (error) {
        this.rethrowUnlessProfessionalTaken(error);
      }
    }
    throw new ConflictError(SLOT_TAKEN_MESSAGE);
  }

  async reschedule(
    actor: Actor,
    id: string,
    dto: RescheduleAppointmentRequestDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findModifiable(actor, id);
    return this.applyReschedule(appointment, dto, actor.role !== Role.OWNER);
  }

  private async applyReschedule(
    appointment: AppointmentRecord,
    dto: RescheduleAppointmentRequestDto,
    withOwner: boolean,
  ): Promise<AppointmentResponseDto> {
    this.assertBookable(dto.startsAt);
    if (dto.durationMinutes !== undefined && !isProcedure(appointment.type)) {
      throw new ValidationError("La duracion solo se cambia en cirugias y examenes");
    }

    const kind = kindOf(appointment);
    const endsAt = addMinutes(
      dto.startsAt,
      dto.durationMinutes ?? minutesBetween(appointment.startsAt, appointment.endsAt),
    );
    const currentId = professionalOf(appointment)?.id;
    const candidates = await this.freeCandidates(
      kind,
      dto.startsAt,
      endsAt,
      dto.professionalId ?? currentId,
      appointment.id,
    );

    for (const candidate of candidates) {
      try {
        const updated = await this.repository.update(appointment.id, kind, {
          startsAt: dto.startsAt,
          endsAt,
          professionalId: candidate.id,
        });
        this.events.appointmentChanged(updated.id);
        await this.notifier.appointmentEvent("CHANGED", updated.id); // RN-35
        return toResponse(updated, withOwner);
      } catch (error) {
        this.rethrowUnlessProfessionalTaken(error);
      }
    }
    throw new ConflictError(SLOT_TAKEN_MESSAGE);
  }

  async cancel(
    actor: Actor,
    id: string,
    dto: CancelAppointmentRequestDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findModifiable(actor, id);
    return this.applyCancel(appointment, dto.reason, actor.role !== Role.OWNER);
  }

  private async applyCancel(
    appointment: AppointmentRecord,
    reason: string,
    withOwner: boolean,
  ): Promise<AppointmentResponseDto> {
    const updated = await this.repository.update(appointment.id, kindOf(appointment), {
      status: AppointmentStatus.CANCELLED,
      cancelReason: reason,
    });
    this.events.appointmentChanged(updated.id);
    await this.notifier.appointmentEvent("CANCELLED", updated.id); // RN-35
    return toResponse(updated, withOwner);
  }

  // RN-84: enlace personal de los correos. Quien lo tiene hace lo que el propietario desde su cuenta, con las mismas
  // reglas (cita activa y más de 2 horas de anticipación). Un enlace inválido o de una cita inexistente responde igual.
  async managedByLink(token: string): Promise<ManagedAppointmentDto> {
    const appointment = await this.appointmentOfLink(token);
    const blockedReason = this.blockedReasonOf(appointment);
    return {
      appointment: toResponse(appointment, false),
      canChange: blockedReason === null,
      blockedReason,
    };
  }

  async cancelByLink(token: string, dto: CancelByLinkRequestDto): Promise<ManagedAppointmentDto> {
    const appointment = await this.appointmentOfLink(token);
    this.assertModifiable(appointment, true);
    const cancelled = await this.applyCancel(
      appointment,
      dto.reason ?? CANCEL_BY_LINK_REASON,
      false,
    );
    return {
      appointment: cancelled,
      canChange: false,
      blockedReason: "La cita ya no admite cambios",
    };
  }

  async rescheduleByLink(
    token: string,
    dto: RescheduleAppointmentRequestDto,
  ): Promise<ManagedAppointmentDto> {
    const appointment = await this.appointmentOfLink(token);
    this.assertModifiable(appointment, true);
    const updated = await this.applyReschedule(appointment, dto, false);
    return { appointment: updated, canChange: true, blockedReason: null };
  }

  async registerArrival(id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.findOrFail(id);
    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new ConflictError("Solo se puede registrar la llegada de una cita programada");
    }
    const updated = await this.repository.update(id, kindOf(appointment), {
      status: AppointmentStatus.CONFIRMED,
    });
    this.events.appointmentChanged(updated.id);
    return toResponse(updated, true);
  }

  // D-72: el veterinario asignado inicia la atención de una cita confirmada. No cambia el estado (pasa a ATTENDED al
  // guardar el registro clínico) y repetirla devuelve el mismo instante, sin otro aviso.
  async startAttention(actor: Actor, id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.findOrFail(id);
    const { veterinarianId } = await this.repository.findProfileIds(actor.id);
    if (!veterinarianId || appointment.veterinarianId !== veterinarianId) {
      throw new ForbiddenError();
    }
    if (appointment.attentionStartedAt) return toResponse(appointment, true);
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictError("Solo se puede iniciar la atencion de una cita confirmada");
    }

    const startedAt = this.clock();
    const updated = await this.repository.markAttentionStarted(id, startedAt);
    if (!updated) throw new NotFoundError("Cita no encontrada");
    // Si otra llamada ganó la carrera, el valor guardado es el suyo y ya emitió el aviso.
    if (updated.attentionStartedAt?.getTime() === startedAt.getTime()) {
      this.events.appointmentChanged(updated.id);
    }
    return toResponse(updated, true);
  }

  // RN-83: el propietario muestra el QR de su cita; recepción lo escanea y la cita queda confirmada.
  async checkInCode(actor: Actor, id: string): Promise<CheckInCodeResponseDto> {
    const appointment = await this.findOrFail(id);
    await this.assertCanAccessOwner(actor, appointment.patient.ownerId);
    if (appointment.status === AppointmentStatus.CONFIRMED) {
      throw new ConflictError("La llegada ya esta registrada");
    }
    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new ConflictError("La cita ya no admite llegada");
    }

    const code = this.checkInCodes.issue(appointment.id, appointment.startsAt);
    return {
      appointmentId: appointment.id,
      code,
      qrSvg: await toQrSvg(code),
      startsAt: appointment.startsAt,
    };
  }

  // Solo el día de la cita (hora de la clínica); lo demás es igual a registrar la llegada a mano.
  // D-66: un código de antes de reprogramar la cita ya no sirve.
  async checkIn(code: string): Promise<AppointmentResponseDto> {
    const payload = this.checkInCodes.verify(code);
    if (!payload) throw new ValidationError("Codigo de llegada invalido");

    const appointment = await this.findOrFail(payload.appointmentId);
    if (!this.checkInCodes.matches(payload, appointment.startsAt)) {
      throw new ConflictError("Este codigo es de una cita reprogramada. Usa el codigo nuevo");
    }
    if (clinicDateOf(appointment.startsAt) !== clinicDateOf(this.clock())) {
      throw new ConflictError("La cita no es de hoy");
    }
    return this.registerArrival(appointment.id);
  }

  // D-69: la agenda de recepción se suscribe a los cambios de citas; devuelve la función que cancela la suscripción.
  subscribeToChanges(listener: AppointmentChangeListener): () => void {
    return this.events.subscribe(listener);
  }

  // D-66, RN-85: la página de escaneo de recepción entra con el token del enlace, sin sesión.
  assertScannerToken(token: string): void {
    if (!this.scanner.accepts(token)) throw new NotFoundError(LINK_NOT_FOUND_MESSAGE);
  }

  // D-68: recepción obtiene el enlace de escaneo y su QR fijo; se lee el token existente, nunca se crea ni se cambia.
  async scannerAccess(): Promise<ScannerAccessResponseDto> {
    const url = this.scanner.accessLink(this.frontendUrl);
    if (!url) throw new NotFoundError("El acceso de escaneo no esta configurado");
    return { url, qrSvg: await toQrSvg(url) };
  }

  async checkInFromScanner(token: string, code: string): Promise<CheckInScanResultDto> {
    this.assertScannerToken(token);
    const appointment = await this.checkIn(code);
    return { patientName: appointment.patient.name, startsAt: appointment.startsAt };
  }

  // D-66: el recordatorio muestra el QR como imagen; solo se dibuja si el código es auténtico.
  async checkInQrImage(code: string): Promise<Buffer> {
    if (!this.checkInCodes.verify(code)) throw new NotFoundError(LINK_NOT_FOUND_MESSAGE);
    return toQrPng(code);
  }

  async markNoShow(id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.findOrFail(id);
    if (!ACTIVE_STATUSES.includes(appointment.status)) {
      throw new ConflictError("La cita ya no admite cambios");
    }
    if (this.clock() < addMinutes(appointment.startsAt, NO_SHOW_GRACE_MINUTES)) {
      throw new ConflictError(
        `Aun no han pasado ${NO_SHOW_GRACE_MINUTES} minutos desde la hora de la cita`,
      );
    }
    const updated = await this.repository.update(id, kindOf(appointment), {
      status: AppointmentStatus.NO_SHOW,
    });
    this.events.appointmentChanged(updated.id);
    return toResponse(updated, true);
  }

  async reassign(id: string, dto: ReassignAppointmentRequestDto): Promise<AppointmentResponseDto> {
    const appointment = await this.findOrFail(id);
    if (!ACTIVE_STATUSES.includes(appointment.status)) {
      throw new ConflictError("La cita ya no admite cambios");
    }

    const kind = kindOf(appointment);
    const [candidate] = await this.freeCandidates(
      kind,
      appointment.startsAt,
      appointment.endsAt,
      dto.professionalId,
      appointment.id,
    );
    if (!candidate) throw new ConflictError(SLOT_TAKEN_MESSAGE);

    try {
      const updated = await this.repository.update(id, kind, { professionalId: candidate.id });
      this.events.appointmentChanged(updated.id);
      await this.notifier.appointmentEvent("CHANGED", updated.id); // RN-35
      return toResponse(updated, true);
    } catch (error) {
      this.rethrowUnlessProfessionalTaken(error);
      throw new ConflictError(SLOT_TAKEN_MESSAGE);
    }
  }

  // RF-16: recepción ve toda la agenda; veterinarios y estilistas, solo la suya.
  async agenda(actor: Actor, query: AgendaQueryDto): Promise<AppointmentResponseDto[]> {
    const own = await this.ownScope(actor);
    const records = await this.repository.listAgenda({
      from: clinicInstant(query.from, 0),
      to: clinicInstant(addDays(query.to ?? query.from, 1), 0),
      veterinarianId: own?.veterinarianId ?? query.veterinarianId,
      groomerId: own?.groomerId ?? query.groomerId,
      status: query.status,
    });
    return records.map((record) => toResponse(record, true));
  }

  async listMine(
    userId: string,
    query: ListMyAppointmentsQueryDto,
  ): Promise<Paginated<AppointmentResponseDto>> {
    const ownerId = await this.repository.findOwnerIdByUserId(userId);
    if (!ownerId) throw new ForbiddenError();

    const { items, total } = await this.repository.listForOwner({
      ownerId,
      when: query.when,
      now: this.clock(),
      skip: skipOf(query.page, query.limit),
      take: query.limit,
    });
    return paginate(
      items.map((record) => toResponse(record, false)),
      total,
      query.page,
      query.limit,
    );
  }

  private async ownScope(
    actor: Actor,
  ): Promise<{ veterinarianId?: string; groomerId?: string } | null> {
    if (actor.role === Role.RECEPTIONIST) return null;
    const ids = await this.repository.findProfileIds(actor.id);
    if (actor.role === Role.VETERINARIAN && ids.veterinarianId) {
      return { veterinarianId: ids.veterinarianId };
    }
    if (actor.role === Role.GROOMER && ids.groomerId) return { groomerId: ids.groomerId };
    throw new ForbiddenError();
  }

  // D-71: cirugías y exámenes llevan la duración de la cita; el resto, la configurada por tipo (RN-19).
  private async durationFor(type: AppointmentType, requested: number | undefined): Promise<number> {
    if (!isProcedure(type)) return this.durationOf(type);
    if (requested === undefined) {
      throw new ValidationError("La duracion es obligatoria para cirugias y examenes");
    }
    return requested;
  }

  private async durationOf(type: AppointmentType): Promise<number> {
    const setting = await this.types.find(type);
    if (!setting) throw new NotFoundError("Tipo de cita no encontrado");
    return setting.durationMinutes;
  }

  // RN-21 y RN-22.
  private bookingWindow(): { from: Date; to: Date } {
    const now = this.clock();
    return {
      from: addMinutes(now, MIN_APPOINTMENT_LEAD_HOURS * HOUR_MINUTES),
      to: addMinutes(now, MAX_APPOINTMENT_ADVANCE_DAYS * DAY_HOURS * HOUR_MINUTES),
    };
  }

  private assertBookable(startsAt: Date): void {
    const aligned =
      startsAt.getUTCSeconds() === 0 &&
      startsAt.getUTCMilliseconds() === 0 &&
      startsAt.getUTCMinutes() % SLOT_MINUTES === 0;
    if (!aligned) {
      throw new ValidationError(
        `La hora de la cita debe ser en franjas de ${SLOT_MINUTES} minutos`,
      );
    }

    const window = this.bookingWindow();
    if (startsAt < window.from) {
      throw new ConflictError(
        `La cita debe agendarse con al menos ${MIN_APPOINTMENT_LEAD_HOURS} horas de anticipacion`,
      );
    }
    if (startsAt > window.to) {
      throw new ConflictError(
        `La cita puede agendarse hasta ${MAX_APPOINTMENT_ADVANCE_DAYS} dias hacia adelante`,
      );
    }
  }

  // RN-20, RN-26: profesionales activos con la franja dentro de su horario y sin cita cruzada.
  private async freeCandidates(
    kind: ProfessionalKind,
    startsAt: Date,
    endsAt: Date,
    professionalId?: string,
    excludeAppointmentId?: string,
  ): Promise<ProfessionalRecord[]> {
    const professionals = await this.repository.findProfessionals(kind, professionalId);
    if (professionalId && professionals.length === 0) {
      throw new NotFoundError("Profesional no encontrado");
    }

    const date = clinicDateOf(startsAt);
    const startMinute = minutesBetween(clinicInstant(date, 0), startsAt);
    const endMinute = startMinute + minutesBetween(startsAt, endsAt);
    const inSchedule = professionals.filter((professional) =>
      scheduleCovers(professional.schedules, date, startMinute, endMinute),
    );
    if (inSchedule.length === 0) throw new ConflictError(SLOT_TAKEN_MESSAGE);

    const busy: BusyRecord[] = await this.repository.findBusy(
      kind,
      inSchedule.map((professional) => professional.id),
      startsAt,
      endsAt,
      excludeAppointmentId,
    );
    const free = inSchedule.filter(
      (professional) => !overlapsBusy(busy, professional.id, startsAt, endsAt),
    );
    if (free.length === 0) throw new ConflictError(SLOT_TAKEN_MESSAGE);
    return free;
  }

  // RN-33: las fechas con disponibilidad más cercanas a la elegida, antes o después.
  private nearestDates(
    chosen: string,
    firstDate: string,
    lastDate: string,
    offersOn: (date: string) => unknown[],
  ): string[] {
    const dates: string[] = [];
    for (let date = firstDate; date <= lastDate; date = addDays(date, 1)) {
      if (date !== chosen && offersOn(date).length > 0) dates.push(date);
    }
    return dates
      .sort(
        (a, b) =>
          Math.abs(daysBetween(chosen, a)) - Math.abs(daysBetween(chosen, b)) || a.localeCompare(b),
      )
      .slice(0, SUGGESTED_DATES_COUNT)
      .sort();
  }

  private rethrowUnlessProfessionalTaken(error: unknown): void {
    if (!(error instanceof SlotTakenError)) throw error;
    if (error.target === "PATIENT") {
      throw new ConflictError("La mascota ya tiene una cita en esa franja"); // RN-23
    }
  }

  private async assertCanAccessOwner(actor: Actor, ownerId: string): Promise<void> {
    if (actor.role !== Role.OWNER) return;
    if ((await this.repository.findOwnerIdByUserId(actor.id)) !== ownerId) {
      throw new ForbiddenError();
    }
  }

  // RN-28: el propietario solo cambia citas activas con más de 2 horas de anticipación; recepción, las activas.
  private async findModifiable(actor: Actor, id: string): Promise<AppointmentRecord> {
    const appointment = await this.findOrFail(id);
    await this.assertCanAccessOwner(actor, appointment.patient.ownerId);
    if (actor.role === Role.OWNER && isProcedure(appointment.type)) {
      throw new ForbiddenError(PROCEDURE_RECEPTION_ONLY_MESSAGE); // D-71
    }
    this.assertModifiable(appointment, actor.role === Role.OWNER);
    return appointment;
  }

  private assertModifiable(appointment: AppointmentRecord, enforceLead: boolean): void {
    const blocked = this.blockedReasonOf(appointment, enforceLead);
    if (blocked) throw new ConflictError(blocked);
  }

  // null = se puede cambiar. `enforceLead` es la restricción de 2 horas, que rige solo para el propietario.
  private blockedReasonOf(appointment: AppointmentRecord, enforceLead = true): string | null {
    if (!ACTIVE_STATUSES.includes(appointment.status)) return "La cita ya no admite cambios";
    // D-71: quien llega por el enlace del correo (enforceLead) es el propietario y no cambia cirugías ni exámenes.
    if (enforceLead && isProcedure(appointment.type)) return PROCEDURE_RECEPTION_ONLY_MESSAGE;
    const lead = addMinutes(this.clock(), MIN_APPOINTMENT_LEAD_HOURS * HOUR_MINUTES);
    if (enforceLead && appointment.startsAt <= lead) return CONTACT_CLINIC_MESSAGE;
    return null;
  }

  private async appointmentOfLink(token: string): Promise<AppointmentRecord> {
    const id = this.manageLinks.verify(token);
    if (!id) throw new NotFoundError(LINK_NOT_FOUND_MESSAGE);
    const appointment = await this.repository.findById(id);
    if (!appointment) throw new NotFoundError(LINK_NOT_FOUND_MESSAGE);
    return appointment;
  }

  private async findOrFail(id: string): Promise<AppointmentRecord> {
    const appointment = await this.repository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    return appointment;
  }
}
