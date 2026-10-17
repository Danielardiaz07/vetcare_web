import type { Patient } from "@prisma/client";
import type {
  CreatePatientRequestDto,
  ListMyPatientsQueryDto,
  ListPatientsQueryDto,
  PatientResponseDto,
  UpdatePatientRequestDto,
} from "@/modules/patients/dto/patients.dto";
import type { PatientsRepository } from "@/modules/patients/patients.repository";
import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors";
import { ageFrom } from "@/shared/utils/age";
import { paginate, skipOf, type Paginated } from "@/shared/utils/pagination";

const ISO_DATE_LENGTH = 10;

function toPatientResponse(patient: Patient): PatientResponseDto {
  return {
    id: patient.id,
    ownerId: patient.ownerId,
    name: patient.name,
    species: patient.species,
    breed: patient.breed,
    sex: patient.sex,
    birthDate: patient.birthDate.toISOString().slice(0, ISO_DATE_LENGTH),
    age: ageFrom(patient.birthDate),
    weightKg: patient.weightKg.toNumber(),
    photoPath: patient.photoPath,
    active: patient.active,
    createdAt: patient.createdAt,
  };
}

export class PatientsService {
  constructor(private readonly repository: PatientsRepository) {}

  async create(dto: CreatePatientRequestDto): Promise<PatientResponseDto> {
    const owner = await this.repository.findOwnerState(dto.ownerId);
    if (!owner) throw new NotFoundError("Propietario no encontrado");
    if (!owner.active) throw new ConflictError("El propietario esta desactivado");

    return toPatientResponse(await this.repository.create(dto));
  }

  async list(query: ListPatientsQueryDto): Promise<Paginated<PatientResponseDto>> {
    const { items, total } = await this.repository.list({
      ownerId: query.ownerId,
      species: query.species,
      q: query.q,
      active: query.active,
      skip: skipOf(query.page, query.limit),
      take: query.limit,
    });
    return paginate(items.map(toPatientResponse), total, query.page, query.limit);
  }

  async getById(id: string): Promise<PatientResponseDto> {
    return toPatientResponse(await this.findOrFail(id));
  }

  async update(id: string, dto: UpdatePatientRequestDto): Promise<PatientResponseDto> {
    await this.findOrFail(id);
    return toPatientResponse(await this.repository.update(id, dto));
  }

  // RN-14: se desactiva, no se elimina, para conservar el historial.
  async deactivate(id: string): Promise<void> {
    await this.findOrFail(id);
    await this.repository.update(id, { active: false });
  }

  // Portal (RN-16): el propietario solo ve las mascotas activas de su cédula.
  async listMine(
    userId: string,
    query: ListMyPatientsQueryDto,
  ): Promise<Paginated<PatientResponseDto>> {
    const ownerId = await this.ownerIdOf(userId);
    const { items, total } = await this.repository.list({
      ownerId,
      active: true,
      skip: skipOf(query.page, query.limit),
      take: query.limit,
    });
    return paginate(items.map(toPatientResponse), total, query.page, query.limit);
  }

  async getMine(userId: string, id: string): Promise<PatientResponseDto> {
    const ownerId = await this.ownerIdOf(userId);
    const patient = await this.findOrFail(id);
    if (patient.ownerId !== ownerId) throw new ForbiddenError();
    return toPatientResponse(patient);
  }

  private async ownerIdOf(userId: string): Promise<string> {
    const ownerId = await this.repository.findOwnerIdByUserId(userId);
    if (!ownerId) throw new ForbiddenError();
    return ownerId;
  }

  private async findOrFail(id: string): Promise<Patient> {
    const patient = await this.repository.findById(id);
    if (!patient) throw new NotFoundError("Paciente no encontrado");
    return patient;
  }
}
