import { prisma } from "@/shared/prisma";

export interface IDatabaseProbe {
  ping(): Promise<void>;
}

export class HealthRepository implements IDatabaseProbe {
  async ping(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  }
}
