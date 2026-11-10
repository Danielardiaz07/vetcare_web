import { AppointmentStatus, Role } from "@prisma/client";
import { VACCINE_DUE_SOON_DAYS } from "@/config/constants";
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
  SurgeryResponseDto,
  VaccinationCardEntryDto,
  VaccinationResponseDto,
  VaccineResponseDto,
  VaccineStatus,
} from "@/modules/clinical/dto/clinical.dto";
import type {
  ClinicalRepository,
  ConsultationRecord,
  HistoryFilters,
  HospitalizationRecord,
  LabExamRecord,
  SurgeryRecord,
  VaccinationRecord,
} from "@/modules/clinical/clinical.repository";
import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors";
import { addDays, clinicDateOf, clinicInstant } from "@/shared/utils/clinic-time";
import { paginate, skipOf, type Paginated } from "@/shared/utils/pagination";

export interface Actor {
  id: string;
  role: Role;
}

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
    patientId: record.patientId,
    veterinarian: record.veterinarian,
    examType: record.examType,
    performedAt: isoDate(record.performedAt),
    results: record.results,
    createdAt: record.createdAt,
  };
}

export class ClinicalService {
  constructor(
    private readonly repository: ClinicalRepository,
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
    return toVaccinationResponse(record);
  }

  // RN-50: cirugías, internaciones y exámenes los registra solo un veterinario, sin cita obligatoria.
  async createSurgery(actor: Actor, dto: CreateSurgeryRequestDto): Promise<SurgeryResponseDto> {
    const veterinarianId = await this.requireVeterinarian(actor);
    const patient = await this.requireActivePatient(dto.patientId);
    const record = await this.repository.createSurgery({
      patientId: patient.id,
      veterinarianId,
      procedure: dto.procedure,
      performedAt: utcMidnight(dto.performedAt),
      notes: dto.notes,
    });
    return toSurgeryResponse(record);
  }

  async createLabExam(actor: Actor, dto: CreateLabExamRequestDto): Promise<LabExamResponseDto> {
    const veterinarianId = await this.requireVeterinarian(actor);
    const patient = await this.requireActivePatient(dto.patientId);
    const record = await this.repository.createLabExam({
      patientId: patient.id,
      veterinarianId,
      examType: dto.examType,
      performedAt: utcMidnight(dto.performedAt),
      results: dto.results,
    });
    return toLabExamResponse(record);
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
      return { ...response, status: this.statusOf(response.nextDoseAt, today) };
    });
  }

  // Mismas reglas que la consulta: RN-44 (veterinario asignado) y RN-43 (cita confirmada).
  private async assertCanCloseAppointment(
    appointmentId: string,
    patientId: string,
    veterinarianId: string,
  ): Promise<void> {
    const appointment = await this.repository.findAppointment(appointmentId);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
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

  private statusOf(nextDoseAt: string | null, today: string): VaccineStatus {
    if (!nextDoseAt) return "UP_TO_DATE";
    if (nextDoseAt < today) return "OVERDUE";
    return nextDoseAt <= addDays(today, VACCINE_DUE_SOON_DAYS) ? "DUE_SOON" : "UP_TO_DATE";
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
