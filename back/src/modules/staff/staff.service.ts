import { Role } from "@prisma/client";
import type {
  CreateStaffRequestDto,
  ListStaffQueryDto,
  ReplaceSchedulesRequestDto,
  ScheduleBlockResponseDto,
  StaffPublicResponseDto,
  StaffResponseDto,
  UpdateStaffRequestDto,
} from "@/modules/staff/dto/staff.dto";
import type { StaffUsersRepository } from "@/modules/staff/staff-users.repository";
import type {
  ScheduleRecord,
  StaffProfileRecord,
  StaffRepository,
} from "@/modules/staff/staff.repository";
import { COLOMBIA_PHONE_PREFIX } from "@/config/constants";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors";
import { formatTimeOfDay, parseTimeOfDay } from "@/shared/utils/time";
import { paginate, skipOf, type Paginated } from "@/shared/utils/pagination";

export interface StaffKind {
  label: string;
  role: Role;
  linkKey: "veterinarianId" | "groomerId";
}

export const VETERINARIAN_KIND: StaffKind = {
  label: "Veterinario",
  role: Role.VETERINARIAN,
  linkKey: "veterinarianId",
};
export const GROOMER_KIND: StaffKind = {
  label: "Estilista",
  role: Role.GROOMER,
  linkKey: "groomerId",
};

// El personal interno ve el perfil completo; el propietario solo lo necesario para elegir.
const FULL_VIEW_ROLES: readonly Role[] = [Role.ADMIN, Role.RECEPTIONIST];

function toFullResponse(record: StaffProfileRecord): StaffResponseDto {
  const { specialty, ...rest } = record;
  return { ...rest, ...(specialty !== undefined && { specialty }) };
}

function toPublicResponse(record: StaffProfileRecord): StaffPublicResponseDto {
  return {
    id: record.id,
    firstNames: record.firstNames,
    lastNames: record.lastNames,
    ...(record.specialty !== undefined && { specialty: record.specialty }),
  };
}

function toScheduleResponse(block: ScheduleRecord): ScheduleBlockResponseDto {
  return {
    id: block.id,
    weekday: block.weekday,
    startTime: formatTimeOfDay(block.startTime),
    endTime: formatTimeOfDay(block.endTime),
  };
}

export class StaffService {
  constructor(
    private readonly repository: StaffRepository,
    private readonly users: StaffUsersRepository,
    private readonly kind: StaffKind,
  ) {}

  async create(dto: CreateStaffRequestDto): Promise<StaffResponseDto> {
    const user = await this.users.findLinkableUser(dto.userId);
    if (!user) throw new NotFoundError("Usuario no encontrado");
    if (user.role !== this.kind.role) {
      throw new ValidationError(`El usuario no tiene el rol de ${this.kind.label.toLowerCase()}`);
    }
    if (user[this.kind.linkKey] !== null) {
      throw new ConflictError(`El usuario ya tiene un perfil de ${this.kind.label.toLowerCase()}`);
    }
    if (await this.repository.existsByDocument(dto.documentNumber)) {
      throw new ConflictError("La cedula ya esta registrada");
    }

    const record = await this.repository.create({
      ...dto,
      phone: `${COLOMBIA_PHONE_PREFIX}${dto.phone}`,
    });
    return toFullResponse(record);
  }

  async list(
    query: ListStaffQueryDto,
    viewerRole: Role,
  ): Promise<Paginated<StaffResponseDto | StaffPublicResponseDto>> {
    const full = FULL_VIEW_ROLES.includes(viewerRole);
    const { items, total } = await this.repository.list({
      q: query.q,
      active: full ? query.active : true,
      skip: skipOf(query.page, query.limit),
      take: query.limit,
    });
    return paginate(
      items.map(full ? toFullResponse : toPublicResponse),
      total,
      query.page,
      query.limit,
    );
  }

  async getById(id: string, viewerRole: Role): Promise<StaffResponseDto | StaffPublicResponseDto> {
    const record = await this.findOrFail(id);
    if (FULL_VIEW_ROLES.includes(viewerRole)) return toFullResponse(record);
    if (!record.active) throw this.notFound();
    return toPublicResponse(record);
  }

  async update(id: string, dto: UpdateStaffRequestDto): Promise<StaffResponseDto> {
    await this.findOrFail(id);
    const { phone, ...rest } = dto;
    const updated = await this.repository.update(id, {
      ...rest,
      ...(phone && { phone: `${COLOMBIA_PHONE_PREFIX}${phone}` }),
    });
    return toFullResponse(updated);
  }

  async getSchedules(id: string): Promise<ScheduleBlockResponseDto[]> {
    await this.findOrFail(id);
    return (await this.repository.listSchedules(id)).map(toScheduleResponse);
  }

  async replaceSchedules(
    id: string,
    dto: ReplaceSchedulesRequestDto,
  ): Promise<ScheduleBlockResponseDto[]> {
    await this.findOrFail(id);
    const blocks = dto.schedules.map((block) => ({
      weekday: block.weekday,
      startTime: parseTimeOfDay(block.startTime),
      endTime: parseTimeOfDay(block.endTime),
    }));
    return (await this.repository.replaceSchedules(id, blocks)).map(toScheduleResponse);
  }

  private notFound(): NotFoundError {
    return new NotFoundError(`${this.kind.label} no encontrado`);
  }

  private async findOrFail(id: string): Promise<StaffProfileRecord> {
    const record = await this.repository.findById(id);
    if (!record) throw this.notFound();
    return record;
  }
}
