import { AppointmentStatus, LabExamStatus, Role } from "@prisma/client";
import { WEIGHT_ALERT_PERCENT } from "@/config/constants";
import type {
  ConsultationResponseDto,
  CreateConsultationRequestDto,
  CreateHospitalizationRequestDto,
  CreateLabExamRequestDto,
  CreateSurgeryRequestDto,
  CreateVaccinationRequestDto,
  CreateVaccineRequestDto,
  DischargeHospitalizationRequestDto,
  HistoryEntryDto,
  HistoryQueryDto,
  HospitalizationResponseDto,
  LabExamResponseDto,
  ListHospitalizationsQueryDto,
  LoadLabResultsRequestDto,
  SurgeryResponseDto,
  VaccinationCardEntryDto,
  VaccinationResponseDto,
  VaccineResponseDto,
  WeightTrendResponseDto,
} from "@/modules/clinical/dto/clinical.dto";
import type {
  AppointmentForConsultation,
  ClinicalRepository,
  ConsultationRecord,
  HistoryFilters,
  HospitalizationRecord,
  LabExamRecord,
  SurgeryRecord,
  VaccinationRecord,
} from "@/modules/clinical/clinical.repository";
import type { IAppointmentEvents } from "@/modules/appointments/appointment-events.interface";
import { isProcedure } from "@/modules/appointments/procedures";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors";
import { addDays, clinicDateOf, clinicInstant } from "@/shared/utils/clinic-time";
import { paginate, skipOf, type Paginated } from "@/shared/utils/pagination";
import { vaccineStatusOf } from "@/shared/utils/vaccine-status";
import { weightChange } from "@/shared/utils/weight-change";

export interface Actor {
  id: string;
  role: Role;
}

const PROCEDURE_APPOINTMENT_MESSAGE =
  "La cita es de cirugia o examen: registra el procedimiento desde la cita"; // D-70
const ISO_DATE_LENGTH = 10;
const isoDate = (value: Date) => value.toISOString().slice(0, ISO_DATE_LENGTH);
const utcMidnight = (date: string) => new Date(`${date}T00:00:00.000Z`);

function toConsultationResponse(
  record: ConsultationRecord,
  withInternalNotes: boolean,
): ConsultationResponseDto {
  return {
    id: record.id,
    appointmentId: record.appointmentId,
    patientId: record.patientId,
    veterinarian: record.veterinarian,
    symptoms: record.symptoms,
    weightKg: record.weightKg.toNumber(),
    temperatureC: record.temperatureC.toNumber(),
    diagnosis: record.diagnosis,
    treatment: record.treatment,
    prescription: record.prescription,
    cost: record.cost.toNumber(),
    createdAt: record.createdAt,
    // RN-42: las notas internas no llegan al propietario.
    ...(withInternalNotes && { internalNotes: record.internalNotes }),
  };
}

function toVaccinationResponse(record: VaccinationRecord): VaccinationResponseDto {
  return {
    id: record.id,
    patientId: record.patientId,
    vaccine: record.vaccine,
    veterinarian: record.veterinarian,
    lot: record.lot,
    appliedAt: isoDate(record.appliedAt),
    nextDoseAt: record.nextDoseAt ? isoDate(record.nextDoseAt) : null,
    price: record.price.toNumber(),
    createdAt: record.createdAt,
  };
}

// Solo los campos del catálogo: el stock y el vencimiento son del inventario y los ve únicamente el administrador (D-36).
function toVaccineResponse(record: {
  id: string;
  name: string;
  price: { toNumber(): number };
  active: boolean;
}): VaccineResponseDto {
  return {
    id: record.id,
    name: record.name,
    price: record.price.toNumber(),
    active: record.active,
  };
}

function toSurgeryResponse(record: SurgeryRecord): SurgeryResponseDto {
  return {
    id: record.id,
    appointmentId: record.appointmentId,
    patientId: record.patientId,
    veterinarian: record.veterinarian,
    procedure: record.procedure,
    performedAt: isoDate(record.performedAt),
    notes: record.notes,
    createdAt: record.createdAt,
  };
}

function toHospitalizationResponse(record: HospitalizationRecord): HospitalizationResponseDto {
  return {
    id: record.id,
    patientId: record.patientId,
    veterinarian: record.veterinarian,
    reason: record.reason,
    status: record.dischargedAt ? "DISCHARGED" : "ADMITTED",
    admittedAt: record.admittedAt,
    dischargedAt: record.dischargedAt,
    dischargeNotes: record.dischargeNotes,
    createdAt: record.createdAt,
  };
}

function toLabExamResponse(record: LabExamRecord): LabExamResponseDto {
  return {
    id: record.id,
    appointmentId: record.appointmentId,
    patientId: record.patientId,
    veterinarian: record.veterinarian,
    examType: record.examType,
    performedAt: isoDate(record.performedAt),
    status: record.status,
    results: record.results,
    resultsAt: record.resultsAt,
    createdAt: record.createdAt,
  };
}

export class ClinicalService {
  constructor(
    private readonly repository: ClinicalRepository,
    private readonly events: IAppointmentEvents,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async createConsultation(
    actor: Actor,
    dto: CreateConsultationRequestDto,
  ): Promise<ConsultationResponseDto> {
    const appointment = await this.repository.findAppointment(dto.appointmentId);
    if (!appointment) throw new NotFoundError("Cita no encontrada");

    const veterinarianId = await this.repository.findVeterinarianIdByUserId(actor.id);
    // RN-44: solo el veterinario asignado a la cita.
    if (!veterinarianId || appointment.veterinarianId !== veterinarianId) {
      throw new ForbiddenError("Solo el veterinario asignado puede registrar la consulta");
    }
    if (isProcedure(appointment.type)) throw new ConflictError(PROCEDURE_APPOINTMENT_MESSAGE);
    // RN-43
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictError("Solo se registra una consulta sobre una cita confirmada");
    }

    const { appointmentId, ...rest } = dto;
    const record = await this.repository.createConsultation({
      ...rest,
      appointmentId,
      patientId: appointment.patientId,
      veterinarianId,
    });
    this.events.appointmentChanged(appointmentId); // la cita pasó a atendida
    return toConsultationResponse(record, true);
  }

  async listVaccines(): Promise<VaccineResponseDto[]> {
    return (await this.repository.listVaccines()).map(toVaccineResponse);
  }

  async createVaccine(dto: CreateVaccineRequestDto): Promise<VaccineResponseDto> {
    return toVaccineResponse(await this.repository.createVaccine(dto));
  }

  async createVaccination(
    actor: Actor,
    dto: CreateVaccinationRequestDto,
  ): Promise<VaccinationResponseDto> {
    const veterinarianId = await this.repository.findVeterinarianIdByUserId(actor.id);
    if (!veterinarianId) throw new ForbiddenError();

    const patient = await this.repository.findPatient(dto.patientId);
    if (!patient) throw new NotFoundError("Paciente no encontrado");
    if (!patient.active) throw new ConflictError("El paciente esta desactivado");

    const vaccine = await this.repository.findVaccine(dto.vaccineId);
    if (!vaccine?.active) throw new NotFoundError("Vacuna no encontrada");

    if (dto.appointmentId)
      await this.assertCanCloseAppointment(dto.appointmentId, patient.id, veterinarianId);

    const record = await this.repository.createVaccination(
      {
        patientId: patient.id,
        veterinarianId,
        vaccineId: vaccine.id,
        lot: dto.lot,
        appliedAt: utcMidnight(dto.appliedAt),
        nextDoseAt: dto.nextDoseAt ? utcMidnight(dto.nextDoseAt) : undefined,
        price: vaccine.price,
      },
      dto.appointmentId,
    );
    if (dto.appointmentId) this.events.appointmentChanged(dto.appointmentId);
    return toVaccinationResponse(record);
  }

  // RN-50: cirugías, internaciones y exámenes los registra solo un veterinario. D-70: con cita, la registra el
  // veterinario asignado, queda vinculada y la cita pasa a ATENDIDA; sin cita (desde la ficha) sigue como antes.
  async createSurgery(actor: Actor, dto: CreateSurgeryRequestDto): Promise<SurgeryResponseDto> {
    const veterinarianId = await this.requireVeterinarian(actor);
    const patient = await this.requireActivePatient(dto.patientId);
    const appointment = dto.appointmentId
      ? await this.requireProcedureAppointment(
          dto.appointmentId,
          "SURGERY",
          patient.id,
          veterinarianId,
        )
      : null;

    const procedure = dto.procedure ?? appointment?.procedureName;
    if (!procedure) throw new ValidationError("El procedimiento es obligatorio");
    const record = await this.repository.createSurgery({
      appointmentId: appointment?.id,
      patientId: patient.id,
      veterinarianId,
      procedure,
      performedAt: dto.performedAt ? utcMidnight(dto.performedAt) : this.today(),
      notes: dto.notes,
    });
    if (appointment) this.events.appointmentChanged(appointment.id);
    return toSurgeryResponse(record);
  }

  // D-70: con cita y sin resultados, el examen queda en espera de resultados (PENDING_RESULTS).
  async createLabExam(actor: Actor, dto: CreateLabExamRequestDto): Promise<LabExamResponseDto> {
    const veterinarianId = await this.requireVeterinarian(actor);
    const patient = await this.requireActivePatient(dto.patientId);
    const appointment = dto.appointmentId
      ? await this.requireProcedureAppointment(
          dto.appointmentId,
          "LAB_EXAM",
          patient.id,
          veterinarianId,
        )
      : null;

    const examType = dto.examType ?? appointment?.procedureName;
    if (!examType) throw new ValidationError("El tipo de examen es obligatorio");
    const record = await this.repository.createLabExam({
      appointmentId: appointment?.id,
      patientId: patient.id,
      veterinarianId,
      examType,
      performedAt: dto.performedAt ? utcMidnight(dto.performedAt) : this.today(),
      status: dto.results ? LabExamStatus.WITH_RESULTS : LabExamStatus.PENDING_RESULTS,
      results: dto.results,
      resultsAt: dto.results ? this.clock() : undefined,
    });
    if (appointment) this.events.appointmentChanged(appointment.id);
    return toLabExamResponse(record);
  }

  // D-70: el veterinario que tomó la muestra carga los resultados en el mismo registro; solo una vez.
  async loadLabResults(
    actor: Actor,
    id: string,
    dto: LoadLabResultsRequestDto,
  ): Promise<LabExamResponseDto> {
    const veterinarianId = await this.requireVeterinarian(actor);
    const exam = await this.repository.findLabExam(id);
    if (!exam) throw new NotFoundError("Examen no encontrado");
    if (exam.veterinarianId !== veterinarianId) {
      throw new ForbiddenError("Solo el veterinario que registro el examen carga los resultados");
    }
    if (exam.status !== LabExamStatus.PENDING_RESULTS) {
      throw new ConflictError("El examen ya tiene resultados");
    }

    const loaded = await this.repository.loadLabExamResults(id, dto.results, this.clock());
    if (!loaded) throw new ConflictError("El examen ya tiene resultados");
    return toLabExamResponse(loaded);
  }

  async admit(
    actor: Actor,
    dto: CreateHospitalizationRequestDto,
  ): Promise<HospitalizationResponseDto> {
    const veterinarianId = await this.requireVeterinarian(actor);
    const patient = await this.requireActivePatient(dto.patientId);
    const record = await this.repository.createHospitalization({
      patientId: patient.id,
      veterinarianId,
      reason: dto.reason,
      admittedAt: this.clock(),
    });
    return toHospitalizationResponse(record);
  }

  async discharge(
    actor: Actor,
    id: string,
    dto: DischargeHospitalizationRequestDto,
  ): Promise<HospitalizationResponseDto> {
    await this.requireVeterinarian(actor);
    const hospitalization = await this.repository.findHospitalization(id);
    if (!hospitalization) throw new NotFoundError("Internacion no encontrada");
    if (hospitalization.dischargedAt) throw new ConflictError("La internacion ya tiene egreso");

    const record = await this.repository.dischargeHospitalization(id, this.clock(), dto.notes);
    return toHospitalizationResponse(record);
  }

  async listHospitalizations(
    query: ListHospitalizationsQueryDto,
  ): Promise<Paginated<HospitalizationResponseDto>> {
    const { items, total } = await this.repository.listHospitalizations({
      status: query.status,
      patientId: query.patientId,
      skip: skipOf(query.page, query.limit),
      take: query.limit,
    });
    return paginate(items.map(toHospitalizationResponse), total, query.page, query.limit);
  }

  // RN-40 a RN-42: línea de tiempo inversa; el propietario solo ve sus mascotas y sin notas internas.
  async history(
    actor: Actor,
    patientId: string,
    query: HistoryQueryDto,
  ): Promise<HistoryEntryDto[]> {
    await this.assertCanView(actor, patientId);
    const withNotes = actor.role !== Role.OWNER;

    const wants = (kind: HistoryEntryDto["kind"]) => !query.type || query.type === kind;
    const timestamps = this.timestampRange(query);
    const dates = this.dateRange(query);

    const [consultations, vaccinations, surgeries, hospitalizations, labExams] = await Promise.all([
      wants("CONSULTATION") ? this.repository.listConsultations(patientId, timestamps) : [],
      wants("VACCINATION") ? this.repository.listVaccinations(patientId, dates) : [],
      wants("SURGERY") ? this.repository.listSurgeries(patientId, dates) : [],
      wants("HOSPITALIZATION")
        ? this.repository.listPatientHospitalizations(patientId, timestamps)
        : [],
      wants("LAB_EXAM") ? this.repository.listLabExams(patientId, dates) : [],
    ]);

    const entries: HistoryEntryDto[] = [
      ...consultations.map((record) => ({
        kind: "CONSULTATION" as const,
        date: record.createdAt,
        consultation: toConsultationResponse(record, withNotes),
      })),
      ...vaccinations.map((record) => ({
        kind: "VACCINATION" as const,
        date: record.appliedAt,
        vaccination: toVaccinationResponse(record),
      })),
      ...surgeries.map((record) => ({
        kind: "SURGERY" as const,
        date: record.performedAt,
        surgery: toSurgeryResponse(record),
      })),
      ...hospitalizations.map((record) => ({
        kind: "HOSPITALIZATION" as const,
        date: record.admittedAt,
        hospitalization: toHospitalizationResponse(record),
      })),
      ...labExams.map((record) => ({
        kind: "LAB_EXAM" as const,
        date: record.performedAt,
        labExam: toLabExamResponse(record),
      })),
    ];
    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // RN-81: la curva sale de las consultas; el propietario solo ve sus mascotas.
  async weightTrend(actor: Actor, patientId: string): Promise<WeightTrendResponseDto> {
    await this.assertCanView(actor, patientId);
    const records = await this.repository.listConsultations(patientId, {});
    const points = records
      .map((record) => ({
        consultationId: record.id,
        date: record.createdAt,
        weightKg: record.weightKg.toNumber(),
      }))
      .reverse();

    const [previous, current] = points.slice(-2);
    return {
      thresholdPercent: WEIGHT_ALERT_PERCENT,
      points,
      change: previous && current ? weightChange(previous.weightKg, current.weightKg) : null,
    };
  }

  // RN-49: estado de la última dosis aplicada de cada vacuna.
  async vaccinationCard(actor: Actor, patientId: string): Promise<VaccinationCardEntryDto[]> {
    await this.assertCanView(actor, patientId);
    const records = await this.repository.listVaccinations(patientId, {});

    const latestByVaccine = new Map<string, VaccinationRecord>();
    for (const record of records) {
      if (!latestByVaccine.has(record.vaccineId)) latestByVaccine.set(record.vaccineId, record);
    }
    const today = clinicDateOf(this.clock());
    return [...latestByVaccine.values()].map((record) => {
      const response = toVaccinationResponse(record);
      return { ...response, status: vaccineStatusOf(response.nextDoseAt, today) };
    });
  }

  // D-70: la cita de cirugía o examen se cierra con su procedimiento. Mismas reglas que la consulta: RN-44
  // (veterinario asignado) y RN-43 (cita confirmada).
  private async requireProcedureAppointment(
    appointmentId: string,
    type: "SURGERY" | "LAB_EXAM",
    patientId: string,
    veterinarianId: string,
  ): Promise<AppointmentForConsultation> {
    const appointment = await this.repository.findAppointment(appointmentId);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    if (appointment.type !== type) {
      throw new ConflictError(
        type === "SURGERY" ? "La cita no es de cirugia" : "La cita no es de examen de laboratorio",
      );
    }
    if (appointment.veterinarianId !== veterinarianId) {
      throw new ForbiddenError("Solo el veterinario asignado puede registrar el procedimiento");
    }
    if (appointment.patientId !== patientId) {
      throw new ConflictError("La cita no corresponde a esa mascota");
    }
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictError("Solo se registra el procedimiento sobre una cita confirmada");
    }
    return appointment;
  }

  private today(): Date {
    return utcMidnight(clinicDateOf(this.clock()));
  }

  // Mismas reglas que la consulta: RN-44 (veterinario asignado) y RN-43 (cita confirmada).
  private async assertCanCloseAppointment(
    appointmentId: string,
    patientId: string,
    veterinarianId: string,
  ): Promise<void> {
    const appointment = await this.repository.findAppointment(appointmentId);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    if (isProcedure(appointment.type)) throw new ConflictError(PROCEDURE_APPOINTMENT_MESSAGE);
    if (appointment.veterinarianId !== veterinarianId) {
      throw new ForbiddenError("Solo el veterinario asignado puede registrar la vacunacion");
    }
    if (appointment.patientId !== patientId) {
      throw new ConflictError("La cita no corresponde a esa mascota");
    }
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictError("Solo se registra una vacunacion sobre una cita confirmada");
    }
  }

  private async requireVeterinarian(actor: Actor): Promise<string> {
    const veterinarianId = await this.repository.findVeterinarianIdByUserId(actor.id);
    if (!veterinarianId) throw new ForbiddenError();
    return veterinarianId;
  }

  private async requireActivePatient(patientId: string) {
    const patient = await this.repository.findPatient(patientId);
    if (!patient) throw new NotFoundError("Paciente no encontrado");
    if (!patient.active) throw new ConflictError("El paciente esta desactivado");
    return patient;
  }

  private timestampRange(query: HistoryQueryDto): HistoryFilters {
    return {
      from: query.from ? clinicInstant(query.from, 0) : undefined,
      to: query.to ? clinicInstant(addDays(query.to, 1), 0) : undefined,
    };
  }

  private dateRange(query: HistoryQueryDto): HistoryFilters {
    return {
      from: query.from ? utcMidnight(query.from) : undefined,
      to: query.to ? utcMidnight(addDays(query.to, 1)) : undefined,
    };
  }

  private async assertCanView(actor: Actor, patientId: string): Promise<void> {
    const patient = await this.repository.findPatient(patientId);
    if (!patient) throw new NotFoundError("Paciente no encontrado");
    if (actor.role !== Role.OWNER) return;
    if ((await this.repository.findOwnerIdByUserId(actor.id)) !== patient.ownerId) {
      throw new ForbiddenError(); // RN-40
    }
  }
}
