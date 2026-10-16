import express from "express";
import helmet from "helmet";
import { API_PREFIX, JSON_BODY_LIMIT } from "@/config/constants";
import { corsMiddleware } from "@/config/cors";
import { globalRateLimiter } from "@/config/rate-limit";
import { v1Router } from "@/routes/v1";
import { errorHandler, notFoundHandler } from "@/shared/middlewares/error-handler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use("/api", globalRateLimiter);
  app.use(API_PREFIX, v1Router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
