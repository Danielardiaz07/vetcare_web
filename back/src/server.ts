import { buildApp } from "@/app";
import { NOTIFICATION_INTERVAL_MS } from "@/config/constants";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { startNotificationScheduler } from "@/modules/notifications/notifications.scheduler";

const { app, notifications } = buildApp();

app.listen(env.PORT, () => {
  logger.info(`API escuchando en el puerto ${env.PORT}`);
  if (env.SCHEDULER_ENABLED) {
    startNotificationScheduler(notifications, NOTIFICATION_INTERVAL_MS);
    logger.info("Programador de notificaciones activo");
  }
});
