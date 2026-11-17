import { HEALTH_DB_TIMEOUT_MS } from "@/config/constants";
import { logger } from "@/config/logger";
import type { IDatabaseProbe } from "@/modules/health/health.repository";

export interface DatabaseHealthDto {
  status: "ok" | "error";
  database: "ok" | "unreachable";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`sin respuesta en ${ms} ms`)), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export class HealthService {
  constructor(
    private readonly probe: IDatabaseProbe,
    private readonly timeoutMs: number = HEALTH_DB_TIMEOUT_MS,
  ) {}

  // D-39: toca la base de datos de verdad. Un monitor externo que lo consulte mantiene activos a la API y a
  // Supabase, que pausa los proyectos gratuitos sin actividad. Nunca lanza: el motivo se registra y no se expone.
  async checkDatabase(): Promise<DatabaseHealthDto> {
    try {
      await withTimeout(this.probe.ping(), this.timeoutMs);
      return { status: "ok", database: "ok" };
    } catch (error) {
      logger.warn({ err: error }, "La base de datos no respondio al chequeo de salud");
      return { status: "error", database: "unreachable" };
    }
  }
}
