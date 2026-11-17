import { AppointmentStatus, AppointmentType, Role } from "@prisma/client";
import type {
  CreateGroomingServiceRequestDto,
  GroomingServiceResponseDto,
} from "@/modules/grooming/dto/grooming.dto";
import type { GroomingRecord, GroomingRepository } from "@/modules/grooming/grooming.repository";
import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors";

export interface Actor {
  id: string;
  role: Role;
}

function toResponse(record: GroomingRecord): GroomingServiceResponseDto {
  return {
    id: record.id,
    appointmentId: record.appointmentId,
    patientId: record.patientId,
    type: record.type,
    observations: record.observations,
    cost: record.cost.toNumber(),
    groomer: record.groomer,
    createdAt: record.createdAt,
  };
}

export class GroomingService {
  constructor(private readonly repository: GroomingRepository) {}

  // RN-51, RF-21: solo el estilista registra; con cita, debe ser la suya y estar confirmada.
  async create(
    actor: Actor,
    dto: CreateGroomingServiceRequestDto,
  ): Promise<GroomingServiceResponseDto> {
    const groomerId = await this.repository.findGroomerIdByUserId(actor.id);
    if (!groomerId) throw new ForbiddenError();

    const patient = await this.repository.findPatient(dto.patientId);
    if (!patient) throw new NotFoundError("Paciente no encontrado");
    if (!patient.active) throw new ConflictError("El paciente esta desactivado");

    if (dto.appointmentId) {
      await this.assertCanCloseAppointment(dto.appointmentId, patient.id, groomerId);
    }

    const record = await this.repository.create({ ...dto, patientId: patient.id, groomerId });
    return toResponse(record);
  }

  // RN-40: el propietario solo ve las mascotas suyas.
  async listByPatient(actor: Actor, patientId: string): Promise<GroomingServiceResponseDto[]> {
    const patient = await this.repository.findPatient(patientId);
    if (!patient) throw new NotFoundError("Paciente no encontrado");
    if (actor.role === Role.OWNER) {
      if ((await this.repository.findOwnerIdByUserId(actor.id)) !== patient.ownerId) {
        throw new ForbiddenError();
      }
    }
    return (await this.repository.listByPatient(patientId)).map(toResponse);
  }

  private async assertCanCloseAppointment(
    appointmentId: string,
    patientId: string,
    groomerId: string,
  ): Promise<void> {
    const appointment = await this.repository.findAppointment(appointmentId);
    if (!appointment) throw new NotFoundError("Cita no encontrada");
    if (appointment.type !== AppointmentType.GROOMING) {
      throw new ConflictError("La cita no es de estetica");
    }
    if (appointment.groomerId !== groomerId) {
      throw new ForbiddenError("Solo el estilista asignado puede registrar el servicio");
    }
    if (appointment.patientId !== patientId) {
      throw new ConflictError("La cita no corresponde a esa mascota");
    }
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictError("Solo se registra un servicio sobre una cita confirmada");
    }
  }
}
