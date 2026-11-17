import type { LinkableUser } from "@/modules/staff/staff.repository";
import { prisma } from "@/shared/prisma";

export class StaffUsersRepository {
  findLinkableUser(userId: string): Promise<LinkableUser | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, veterinarianId: true, groomerId: true },
    });
  }
}
