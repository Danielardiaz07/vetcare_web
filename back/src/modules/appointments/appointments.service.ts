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
  CreateAppointmentRequestDto,
  ListMyAppointmentsQueryDto,
  ReassignAppointmentRequestDto,
  RescheduleAppointmentRequestDto,
} from "@/modules/appointments/dto/appointments.dto";
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

export interface Actor {
  id: string;
  role: Role;
}

const SLOT_TAKEN_MESSAGE = "La franja ya no esta disponible"; // RN-27
const CONTACT_CLINIC_MESSAGE = "Comunicate con la clinica"; // RN-28
const HOUR_MINUTES = 60;
const DAY_HOURS = 24;

const professionalOf = (record: AppointmentRecord) => record.veterinarian ?? record.groomer;
const kindOf = (record: AppointmentRecord): ProfessionalKind => professionalFor(record.type);

function toResponse(record: AppointmentRecord, withOwner: boolean): AppointmentResponseDto {
  const professional = professionalOf(record);
  if (!professional) throw new Error(`La cita ${record.id} no tiene profesional`);
  return {
    id: record.id,
    type: record.type,
    status: record.status,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    reason: record.reason,
    cancelReason: record.cancelReason,
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
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async availability(query: AvailabilityQueryDto): Promise<AvailabilityResponseDto> {
    const kind = professionalFor(query.type);
    const durationMinutes = await this.durationOf(query.type);
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

    const durationMinutes = await this.durationOf(dto.type);
    const endsAt = addMinutes(dto.startsAt, durationMinutes);
    this.assertBookable(dto.startsAt);

    const activeCount = await this.repository.countActiveFuture(patient.id, this.clock());
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
        });
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
    this.assertBookable(dto.startsAt);

    const kind = kindOf(appointment);
    const endsAt = addMinutes(
      dto.startsAt,
      minutesBetween(appointment.startsAt, appointment.endsAt),
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
        return toResponse(updated, actor.role !== Role.OWNER);
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
    const updated = await this.repository.update(appointment.id, kindOf(appointment), {
      status: AppointmentStatus.CANCELLED,
      cancelReason: dto.reason,
    });
    return toResponse(updated, actor.role !== Role.OWNER);
  }

  async registerArrival(id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.findOrFail(id);
    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new ConflictError("Solo se puede registrar la llegada de una cita programada");
    }
    const updated = await this.repository.update(id, kindOf(appointment), {
      status: AppointmentStatus.CONFIRMED,
    });
    return toResponse(updated, true);
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

    if (!ACTIVE_STATUSES.includes(appointment.status)) {
      throw new ConflictError("La cita ya no admite cambios");
    }
    const lead = addMinutes(this.clock(), MIN_APPOINTMENT_LEAD_HOURS * HOUR_MINUTES);
    if (actor.role === Role.OWNER && appointment.startsAt <= lead) {
      throw new ConflictError(CONTACT_CLINIC_MESSAGE);
    }
    return appointment;
  }

  private async findOrFail(id: string): Promise<AppointmentRecord> {
    const appointment = await this.repository.findById(id);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    return appointment;
  }
}
