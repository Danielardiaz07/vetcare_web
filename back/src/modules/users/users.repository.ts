import type { Owner, User } from "@prisma/client";
import { prisma } from "@/shared/prisma";

export class UsersRepository {
  findByIdWithOwner(id: string): Promise<(User & { owner: Owner | null }) | null> {
    return prisma.user.findUnique({ where: { id }, include: { owner: true } });
  }
}
