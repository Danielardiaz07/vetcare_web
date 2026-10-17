import type { Groomer, Prisma } from "@prisma/client";
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

type GroomerRow = Groomer & { user: { id: string } | null };

const withUser = { user: { select: { id: true } } } as const;
const scheduleOrder = [{ weekday: "asc" }, { startTime: "asc" }] as const;

const toRecord = ({ user, ...row }: GroomerRow): StaffProfileRecord => ({
  ...row,
  userId: user?.id ?? null,
});

export class GroomersRepository implements StaffRepository {
  async create({
    userId,
    specialty: _specialty,
    ...data
  }: NewStaffData): Promise<StaffProfileRecord> {
    const row = await prisma.groomer.create({
      data: { ...data, user: { connect: { id: userId } } },
      include: withUser,
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<StaffProfileRecord | null> {
    const row = await prisma.groomer.findUnique({ where: { id }, include: withUser });
    return row && toRecord(row);
  }

  async existsByDocument(documentNumber: string): Promise<boolean> {
    const found = await prisma.groomer.findUnique({
      where: { documentNumber },
      select: { id: true },
    });
    return found !== null;
  }

  async list(filters: StaffListFilters): Promise<{ items: StaffProfileRecord[]; total: number }> {
    const where = this.whereOf(filters);
    const [rows, total] = await prisma.$transaction([
      prisma.groomer.findMany({
        where,
        include: withUser,
        orderBy: [{ lastNames: "asc" }, { firstNames: "asc" }],
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.groomer.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async update(
    id: string,
    { specialty: _specialty, ...data }: StaffUpdateData,
  ): Promise<StaffProfileRecord> {
    return toRecord(await prisma.groomer.update({ where: { id }, data, include: withUser }));
  }

  listSchedules(id: string): Promise<ScheduleRecord[]> {
    return prisma.schedule.findMany({ where: { groomerId: id }, orderBy: [...scheduleOrder] });
  }

  async replaceSchedules(id: string, blocks: NewScheduleBlock[]): Promise<ScheduleRecord[]> {
    await prisma.$transaction([
      prisma.schedule.deleteMany({ where: { groomerId: id } }),
      prisma.schedule.createMany({ data: blocks.map((block) => ({ ...block, groomerId: id })) }),
    ]);
    return this.listSchedules(id);
  }

  private whereOf({ q, active }: StaffListFilters): Prisma.GroomerWhereInput {
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
