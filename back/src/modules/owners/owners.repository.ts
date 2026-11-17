import type { DocumentType, Owner, Prisma } from "@prisma/client";
import { prisma } from "@/shared/prisma";

export type OwnerWithAccount = Owner & { user: { id: string } | null };

export interface OwnerListFilters {
  q?: string;
  active?: boolean;
  skip: number;
  take: number;
}

export interface NewOwnerData {
  documentType: DocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  email?: string;
  phone: string;
  address?: string;
}

const withAccount = { user: { select: { id: true } } } as const;

export class OwnersRepository {
  create(data: NewOwnerData): Promise<OwnerWithAccount> {
    return prisma.owner.create({ data, include: withAccount });
  }

  findById(id: string): Promise<OwnerWithAccount | null> {
    return prisma.owner.findUnique({ where: { id }, include: withAccount });
  }

  async existsByDocument(documentNumber: string): Promise<boolean> {
    const found = await prisma.owner.findUnique({
      where: { documentNumber },
      select: { id: true },
    });
    return found !== null;
  }

  async list(filters: OwnerListFilters): Promise<{ items: OwnerWithAccount[]; total: number }> {
    const where = this.whereOf(filters);
    const [items, total] = await prisma.$transaction([
      prisma.owner.findMany({
        where,
        include: withAccount,
        orderBy: [{ lastNames: "asc" }, { firstNames: "asc" }],
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.owner.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.OwnerUpdateInput): Promise<OwnerWithAccount> {
    return prisma.owner.update({ where: { id }, data, include: withAccount });
  }

  // D-18: el correo del propietario y el de su cuenta cambian juntos o ninguno.
  updateWithAccountEmail(
    id: string,
    userId: string,
    data: Prisma.OwnerUpdateInput,
    accountEmail: string,
  ): Promise<OwnerWithAccount> {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { email: accountEmail } });
      return tx.owner.update({ where: { id }, data, include: withAccount });
    });
  }

  async isEmailTaken(email: string, exceptUserId: string): Promise<boolean> {
    const found = await prisma.user.findFirst({
      where: { email, id: { not: exceptUserId } },
      select: { id: true },
    });
    return found !== null;
  }

  private whereOf({ q, active }: OwnerListFilters): Prisma.OwnerWhereInput {
    return {
      ...(active !== undefined && { active }),
      ...(q && {
        OR: [
          { documentNumber: { contains: q } },
          { firstNames: { contains: q, mode: "insensitive" } },
          { lastNames: { contains: q, mode: "insensitive" } },
        ],
      }),
    };
  }
}
