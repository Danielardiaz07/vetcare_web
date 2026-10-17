import type { Prisma, Veterinarian } from "@prisma/client";
import type {
  NewScheduleBlock,
  NewStaffData,
  ScheduleRecord,
  StaffListFilters,
  StaffProfileRecord,
  StaffRepository,
  StaffUpdateData,
} from "@/modules/staff/staff.repository";
import { prisma } from "@/shared/prisma";

type VeterinarianRow = Veterinarian & { user: { id: string } | null };

const withUser = { user: { select: { id: true } } } as const;
const scheduleOrder = [{ weekday: "asc" }, { startTime: "asc" }] as const;

const toRecord = ({ user, ...row }: VeterinarianRow): StaffProfileRecord => ({
  ...row,
  userId: user?.id ?? null,
});

export class VeterinariansRepository implements StaffRepository {
  async create({ userId, ...data }: NewStaffData): Promise<StaffProfileRecord> {
    const row = await prisma.veterinarian.create({
      data: { ...data, specialty: data.specialty ?? "", user: { connect: { id: userId } } },
      include: withUser,
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<StaffProfileRecord | null> {
    const row = await prisma.veterinarian.findUnique({ where: { id }, include: withUser });
    return row && toRecord(row);
  }

  async existsByDocument(documentNumber: string): Promise<boolean> {
    const found = await prisma.veterinarian.findUnique({
      where: { documentNumber },
      select: { id: true },
    });
    return found !== null;
  }

  async list(filters: StaffListFilters): Promise<{ items: StaffProfileRecord[]; total: number }> {
    const where = this.whereOf(filters);
    const [rows, total] = await prisma.$transaction([
      prisma.veterinarian.findMany({
        where,
        include: withUser,
        orderBy: [{ lastNames: "asc" }, { firstNames: "asc" }],
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.veterinarian.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async update(id: string, data: StaffUpdateData): Promise<StaffProfileRecord> {
    return toRecord(await prisma.veterinarian.update({ where: { id }, data, include: withUser }));
  }

  listSchedules(id: string): Promise<ScheduleRecord[]> {
    return prisma.schedule.findMany({
      where: { veterinarianId: id },
      orderBy: [...scheduleOrder],
    });
  }

  async replaceSchedules(id: string, blocks: NewScheduleBlock[]): Promise<ScheduleRecord[]> {
    await prisma.$transaction([
      prisma.schedule.deleteMany({ where: { veterinarianId: id } }),
      prisma.schedule.createMany({
        data: blocks.map((block) => ({ ...block, veterinarianId: id })),
      }),
    ]);
    return this.listSchedules(id);
  }

  private whereOf({ q, active }: StaffListFilters): Prisma.VeterinarianWhereInput {
    return {
      ...(active !== undefined && { active }),
      ...(q && {
        OR: [
          { documentNumber: { contains: q } },
          { firstNames: { contains: q, mode: "insensitive" } },
          { lastNames: { contains: q, mode: "insensitive" } },
          { specialty: { contains: q, mode: "insensitive" } },
        ],
      }),
    };
  }
}
