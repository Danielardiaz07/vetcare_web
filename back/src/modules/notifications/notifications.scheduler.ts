import { logger } from "@/config/logger";
import type { NotificationsService } from "@/modules/notifications/notifications.service";

// D-38 (resuelve P-01): sin librerías, un temporizador dentro de la API. Corre una vez al arrancar, para ponerse al día
// si la API estuvo dormida, y luego cada `intervalMs`. Devuelve la función que lo detiene.
export function startNotificationScheduler(
  service: NotificationsService,
  intervalMs: number,
): () => void {
  const tick = async () => {
    try {
      const summary = await service.runDue();
      if (summary.reminders + summary.vaccineNotices + summary.sent + summary.failed > 0) {
        logger.info(summary, "Programador de notificaciones");
      }
    } catch (error) {
      logger.error({ err: error }, "Fallo el programador de notificaciones");
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
