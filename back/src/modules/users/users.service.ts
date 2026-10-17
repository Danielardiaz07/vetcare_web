import type { UserProfileResponseDto } from "@/modules/users/dto/users.dto";
import type { UsersRepository } from "@/modules/users/users.repository";
import { NotFoundError } from "@/shared/errors";

export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

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
}
