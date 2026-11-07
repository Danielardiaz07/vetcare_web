import type { User } from "@prisma/client";
import { COLOMBIA_PHONE_PREFIX } from "@/config/constants";
import type {
  ChangePasswordRequestDto,
  CreateStaffUserRequestDto,
  ListStaffUsersQueryDto,
  StaffUserResponseDto,
  UpdateMyContactRequestDto,
  UpdateStaffUserRequestDto,
  UserProfileResponseDto,
} from "@/modules/users/dto/users.dto";
import type { UsersRepository } from "@/modules/users/users.repository";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "@/shared/errors";
import type { IHasher, ITokenService } from "@/shared/providers";
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
    private readonly tokens: ITokenService,
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
        address: owner.address,
      },
    };
  }

  // RF-15: el propietario edita su contacto; el correo y la cédula solo cambian en la clínica (D-18).
  async updateMyContact(
    userId: string,
    { phone, address }: UpdateMyContactRequestDto,
  ): Promise<UserProfileResponseDto> {
    const user = await this.repository.findByIdWithOwner(userId);
    if (!user?.ownerId) throw new NotFoundError("Propietario no encontrado");

    await this.repository.updateOwnerContact(user.ownerId, {
      ...(phone && { phone: `${COLOMBIA_PHONE_PREFIX}${phone}` }),
      ...(address !== undefined && { address: address || null }),
    });
    return this.getProfile(userId);
  }

  // RN-02, RF-15. Un error de validación y no 401: un 401 haría que el cliente intente refrescar la sesión.
  async changePassword(
    userId: string,
    dto: ChangePasswordRequestDto,
    refreshToken: string | undefined,
  ): Promise<void> {
    const user = await this.repository.findById(userId);
    if (!user) throw new NotFoundError("Usuario no encontrado");

    if (!(await this.hasher.compare(dto.currentPassword, user.passwordHash))) {
      throw new ValidationError("La contrasena actual es incorrecta");
    }
    if (await this.hasher.compare(dto.password, user.passwordHash)) {
      throw new ValidationError("La contrasena nueva debe ser distinta de la actual");
    }

    await this.repository.changePassword(
      userId,
      await this.hasher.hash(dto.password),
      this.currentSessionId(userId, refreshToken),
    );
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

  private currentSessionId(userId: string, refreshToken: string | undefined): string | undefined {
    if (!refreshToken) return undefined;
    try {
      const { sub, jti } = this.tokens.verifyRefresh(refreshToken);
      return sub === userId ? jti : undefined;
    } catch (error) {
      if (error instanceof UnauthorizedError) return undefined;
      throw error;
    }
  }

  private async findStaffOrFail(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user || user.role === "OWNER") throw new NotFoundError("Usuario no encontrado");
    return user;
  }
}
