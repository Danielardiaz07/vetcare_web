import express from "express";
import helmet from "helmet";
import { API_PREFIX, JSON_BODY_LIMIT } from "@/config/constants";
import { corsMiddleware } from "@/config/cors";
import { env } from "@/config/env";
import { globalRateLimiter } from "@/config/rate-limit";
import { AppointmentTypesController } from "@/modules/appointments/appointment-types.controller";
import { AppointmentTypesRepository } from "@/modules/appointments/appointment-types.repository";
import { createAppointmentTypesRouter } from "@/modules/appointments/appointment-types.routes";
import { AppointmentTypesService } from "@/modules/appointments/appointment-types.service";
import { AppointmentsController } from "@/modules/appointments/appointments.controller";
import { AppointmentsRepository } from "@/modules/appointments/appointments.repository";
import {
  createAppointmentsRouter,
  createMyAppointmentsRouter,
} from "@/modules/appointments/appointments.routes";
import { AppointmentsService } from "@/modules/appointments/appointments.service";
import { ClinicalController } from "@/modules/clinical/clinical.controller";
import { ClinicalRepository } from "@/modules/clinical/clinical.repository";
import { createClinicalRouter, createMyClinicalRouter } from "@/modules/clinical/clinical.routes";
import { ClinicalService } from "@/modules/clinical/clinical.service";
import { InvoicesController } from "@/modules/invoices/invoices.controller";
import { InvoicesRepository } from "@/modules/invoices/invoices.repository";
import { createInvoicesRouter, createMyInvoicesRouter } from "@/modules/invoices/invoices.routes";
import { InvoicesService } from "@/modules/invoices/invoices.service";
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
import {
  createGroomerRequestSchema,
  createVeterinarianRequestSchema,
  updateGroomerRequestSchema,
  updateVeterinarianRequestSchema,
} from "@/modules/staff/dto/staff.dto";
import { GroomersRepository } from "@/modules/staff/groomers.repository";
import { StaffController } from "@/modules/staff/staff.controller";
import { createStaffRouter } from "@/modules/staff/staff.routes";
import { GROOMER_KIND, StaffService, VETERINARIAN_KIND } from "@/modules/staff/staff.service";
import { StaffUsersRepository } from "@/modules/staff/staff-users.repository";
import { VeterinariansRepository } from "@/modules/staff/veterinarians.repository";
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
  const usersService = new UsersService(new UsersRepository(), hasher);

  const ownersService = new OwnersService(new OwnersRepository());
  const patientsController = new PatientsController(new PatientsService(new PatientsRepository()));
  const requireAuth = authenticate(tokens);

  const staffUsers = new StaffUsersRepository();
  const veterinarianService = new StaffService(
    new VeterinariansRepository(),
    staffUsers,
    VETERINARIAN_KIND,
  );
  const groomerService = new StaffService(new GroomersRepository(), staffUsers, GROOMER_KIND);
  const appointmentTypesRepository = new AppointmentTypesRepository();
  const appointmentTypesService = new AppointmentTypesService(appointmentTypesRepository);
  const appointmentsController = new AppointmentsController(
    new AppointmentsService(new AppointmentsRepository(), appointmentTypesRepository),
  );
  const clinicalController = new ClinicalController(new ClinicalService(new ClinicalRepository()));
  const invoicesController = new InvoicesController(new InvoicesService(new InvoicesRepository()));

  const v1Router = createV1Router({
    auth: createAuthRouter(new AuthController(authService)),
    users: createUsersRouter(new UsersController(usersService), requireAuth),
    owners: createOwnersRouter(new OwnersController(ownersService), requireAuth),
    patients: createPatientsRouter(patientsController, requireAuth),
    myPatients: createMyPatientsRouter(patientsController, requireAuth),
    veterinarians: createStaffRouter({
      controller: new StaffController(veterinarianService),
      authenticate: requireAuth,
      createSchema: createVeterinarianRequestSchema,
      updateSchema: updateVeterinarianRequestSchema,
    }),
    groomers: createStaffRouter({
      controller: new StaffController(groomerService),
      authenticate: requireAuth,
      createSchema: createGroomerRequestSchema,
      updateSchema: updateGroomerRequestSchema,
    }),
    appointmentTypes: createAppointmentTypesRouter(
      new AppointmentTypesController(appointmentTypesService),
      requireAuth,
    ),
    appointments: createAppointmentsRouter(appointmentsController, requireAuth),
    myAppointments: createMyAppointmentsRouter(appointmentsController, requireAuth),
    clinical: createClinicalRouter(clinicalController, requireAuth),
    myClinical: createMyClinicalRouter(clinicalController, requireAuth),
    invoices: createInvoicesRouter(invoicesController, requireAuth),
    myInvoices: createMyInvoicesRouter(invoicesController, requireAuth),
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
