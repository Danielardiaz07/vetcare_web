import type { User } from "@prisma/client";
import type {
  CreateStaffUserRequestDto,
  ListStaffUsersQueryDto,
  StaffUserResponseDto,
  UpdateStaffUserRequestDto,
  UserProfileResponseDto,
} from "@/modules/users/dto/users.dto";
import type { UsersRepository } from "@/modules/users/users.repository";
import { ConflictError, NotFoundError } from "@/shared/errors";
import type { IHasher } from "@/shared/providers/hasher.interface";
import { paginate, skipOf, type Paginated } from "@/shared/utils/pagination";

function toStaffResponse(user: User): StaffUserResponseDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly hasher: IHasher,
  ) {}

  async getProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.repository.findByIdWithOwner(userId);
    if (!user) throw new NotFoundError("Usuario no encontrado");

    const { owner } = user;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      owner: owner && {
        id: owner.id,
        documentType: owner.documentType,
        documentNumber: owner.documentNumber,
        firstNames: owner.firstNames,
        lastNames: owner.lastNames,
        phone: owner.phone,
      },
    };
  }

  // RN-12: el administrador crea las cuentas del personal y asigna el rol; nacen activas.
  async createStaff(dto: CreateStaffUserRequestDto): Promise<StaffUserResponseDto> {
    if (await this.repository.isEmailTaken(dto.email)) {
      throw new ConflictError("El correo ya esta registrado");
    }
    const user = await this.repository.createStaff({
      email: dto.email,
      passwordHash: await this.hasher.hash(dto.password),
      role: dto.role,
    });
    return toStaffResponse(user);
  }

  async listStaff(query: ListStaffUsersQueryDto): Promise<Paginated<StaffUserResponseDto>> {
    const { items, total } = await this.repository.listStaff({
      role: query.role,
      status: query.status,
      q: query.q,
      skip: skipOf(query.page, query.limit),
      take: query.limit,
    });
    return paginate(items.map(toStaffResponse), total, query.page, query.limit);
  }

  async getStaff(id: string): Promise<StaffUserResponseDto> {
    return toStaffResponse(await this.findStaffOrFail(id));
  }

  async updateStaff(
    actorId: string,
    id: string,
    dto: UpdateStaffUserRequestDto,
  ): Promise<StaffUserResponseDto> {
    const user = await this.findStaffOrFail(id);

    const losesAccess = dto.status === "SUSPENDED";
    const changesRole = dto.role !== undefined && dto.role !== user.role;
    if (id === actorId && (losesAccess || changesRole)) {
      throw new ConflictError("No puedes cambiar tu propio rol ni desactivar tu cuenta");
    }

    const { password, ...rest } = dto;
    const updated = await this.repository.update(
      id,
      { ...rest, ...(password && { passwordHash: await this.hasher.hash(password) }) },
      losesAccess || password !== undefined,
    );
    return toStaffResponse(updated);
  }

  private async findStaffOrFail(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user || user.role === "OWNER") throw new NotFoundError("Usuario no encontrado");
    return user;
  }
}
