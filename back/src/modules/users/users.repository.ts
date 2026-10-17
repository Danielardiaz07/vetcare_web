import type { Owner, Prisma, Role, User, UserStatus } from "@prisma/client";
import { prisma } from "@/shared/prisma";

export interface StaffListFilters {
  role?: Role;
  status?: UserStatus;
  q?: string;
  skip: number;
  take: number;
}

export interface NewStaffUserData {
  email: string;
  passwordHash: string;
  role: Role;
}

export class UsersRepository {
  findByIdWithOwner(id: string): Promise<(User & { owner: Owner | null }) | null> {
    return prisma.user.findUnique({ where: { id }, include: { owner: true } });
  }

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async isEmailTaken(email: string): Promise<boolean> {
    const found = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return found !== null;
  }

  createStaff(data: NewStaffUserData): Promise<User> {
    return prisma.user.create({ data: { ...data, status: "ACTIVE" } });
  }

  async listStaff(filters: StaffListFilters): Promise<{ items: User[]; total: number }> {
    const where = this.staffWhereOf(filters);
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { email: "asc" },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  // Al desactivar una cuenta se cierran sus sesiones: el refresh token deja de servir (RN-10).
  update(id: string, data: Prisma.UserUpdateInput, revokeSessions: boolean): Promise<User> {
    return prisma.$transaction(async (tx) => {
      if (revokeSessions) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return tx.user.update({ where: { id }, data });
    });
  }

  private staffWhereOf({ role, status, q }: StaffListFilters): Prisma.UserWhereInput {
    return {
      role: role ?? { not: "OWNER" },
      ...(status && { status }),
      ...(q && { email: { contains: q, mode: "insensitive" } }),
    };
  }
}
