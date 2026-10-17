import express from "express";
import helmet from "helmet";
import { API_PREFIX, JSON_BODY_LIMIT } from "@/config/constants";
import { corsMiddleware } from "@/config/cors";
import { env } from "@/config/env";
import { globalRateLimiter } from "@/config/rate-limit";
import { AuthController } from "@/modules/auth/auth.controller";
import { AuthRepository } from "@/modules/auth/auth.repository";
import { createAuthRouter } from "@/modules/auth/auth.routes";
import { AuthService } from "@/modules/auth/auth.service";
import { OtpService } from "@/modules/auth/otp.service";
import { OwnersController } from "@/modules/owners/owners.controller";
import { OwnersRepository } from "@/modules/owners/owners.repository";
import { createOwnersRouter } from "@/modules/owners/owners.routes";
import { OwnersService } from "@/modules/owners/owners.service";
import { PatientsController } from "@/modules/patients/patients.controller";
import { PatientsRepository } from "@/modules/patients/patients.repository";
import { createMyPatientsRouter, createPatientsRouter } from "@/modules/patients/patients.routes";
import { PatientsService } from "@/modules/patients/patients.service";
import { UsersController } from "@/modules/users/users.controller";
import { UsersRepository } from "@/modules/users/users.repository";
import { createUsersRouter } from "@/modules/users/users.routes";
import { UsersService } from "@/modules/users/users.service";
import { createV1Router } from "@/routes/v1";
import { errorHandler, notFoundHandler } from "@/shared/middlewares/error-handler";
import { authenticate } from "@/shared/middlewares/authenticate";
import { BcryptHasher } from "@/shared/providers/bcrypt-hasher";
import { BrevoMailProvider } from "@/shared/providers/brevo-mail.provider";
import { JwtTokenService } from "@/shared/providers/jwt-token.service";

export function createApp() {
  const hasher = new BcryptHasher(env.BCRYPT_COST);
  const tokens = new JwtTokenService({
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtl: env.JWT_REFRESH_TTL,
  });
  const mail = new BrevoMailProvider(env.BREVO_API_KEY, {
    email: env.MAIL_FROM_EMAIL,
    name: env.MAIL_FROM_NAME,
  });

  const authRepository = new AuthRepository();
  const otpService = new OtpService(authRepository, hasher, env.OTP_TTL_MINUTES);
  const authService = new AuthService(
    authRepository,
    otpService,
    hasher,
    tokens,
    mail,
    env.OTP_TTL_MINUTES,
  );
  const usersService = new UsersService(new UsersRepository());

  const ownersService = new OwnersService(new OwnersRepository());
  const patientsController = new PatientsController(new PatientsService(new PatientsRepository()));
  const requireAuth = authenticate(tokens);

  const v1Router = createV1Router({
    auth: createAuthRouter(new AuthController(authService)),
    users: createUsersRouter(new UsersController(usersService), requireAuth),
    owners: createOwnersRouter(new OwnersController(ownersService), requireAuth),
    patients: createPatientsRouter(patientsController, requireAuth),
    myPatients: createMyPatientsRouter(patientsController, requireAuth),
  });

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
