import { createApp } from "@/app";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

createApp().listen(env.PORT, () => {
  logger.info(`API escuchando en el puerto ${env.PORT}`);
});
