import { COLOMBIA_PHONE_PREFIX } from "@/config/constants";
import type {
  CreateOwnerRequestDto,
  ListOwnersQueryDto,
  OwnerResponseDto,
  UpdateOwnerRequestDto,
} from "@/modules/owners/dto/owners.dto";
import type { OwnersRepository, OwnerWithAccount } from "@/modules/owners/owners.repository";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors";
import { paginate, skipOf, type Paginated } from "@/shared/utils/pagination";

export function toOwnerResponse(owner: OwnerWithAccount): OwnerResponseDto {
  return {
    id: owner.id,
    documentType: owner.documentType,
    documentNumber: owner.documentNumber,
    firstNames: owner.firstNames,
    lastNames: owner.lastNames,
    email: owner.email,
    phone: owner.phone,
    address: owner.address,
    active: owner.active,
    hasAccount: owner.user !== null,
    createdAt: owner.createdAt,
  };
}

export class OwnersService {
  constructor(private readonly repository: OwnersRepository) {}

  async create(dto: CreateOwnerRequestDto): Promise<OwnerResponseDto> {
    if (await this.repository.existsByDocument(dto.documentNumber)) {
      throw new ConflictError("La cedula ya esta registrada");
    }
    const owner = await this.repository.create({
      ...dto,
      phone: `${COLOMBIA_PHONE_PREFIX}${dto.phone}`,
    });
    return toOwnerResponse(owner);
  }

  async list(query: ListOwnersQueryDto): Promise<Paginated<OwnerResponseDto>> {
    const { items, total } = await this.repository.list({
      q: query.q,
      active: query.active,
      skip: skipOf(query.page, query.limit),
      take: query.limit,
    });
    return paginate(items.map(toOwnerResponse), total, query.page, query.limit);
  }

  async getById(id: string): Promise<OwnerResponseDto> {
    return toOwnerResponse(await this.findOrFail(id));
  }

  async update(id: string, dto: UpdateOwnerRequestDto): Promise<OwnerResponseDto> {
    const owner = await this.findOrFail(id);
    const { phone, ...rest } = dto;
    const data = {
      ...rest,
      ...(phone && { phone: `${COLOMBIA_PHONE_PREFIX}${phone}` }),
    };

    const account = owner.user;
    if (account && dto.email !== undefined) {
      if (dto.email === null) {
        throw new ValidationError("Un propietario con cuenta no puede quedar sin correo");
      }
      if (await this.repository.isEmailTaken(dto.email, account.id)) {
        throw new ConflictError("El correo ya esta registrado");
      }
      return toOwnerResponse(
        await this.repository.updateWithAccountEmail(id, account.id, data, dto.email),
      );
    }

    return toOwnerResponse(await this.repository.update(id, data));
  }

  // RN-14: se desactiva, no se elimina, para conservar el historial.
  async deactivate(id: string): Promise<void> {
    await this.findOrFail(id);
    await this.repository.update(id, { active: false });
  }

  private async findOrFail(id: string): Promise<OwnerWithAccount> {
    const owner = await this.repository.findById(id);
    if (!owner) throw new NotFoundError("Propietario no encontrado");
    return owner;
  }
}
