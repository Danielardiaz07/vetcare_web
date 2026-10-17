import { randomUUID } from "node:crypto";
import { Prisma, type User } from "@prisma/client";
import {
  COLOMBIA_PHONE_PREFIX,
  DUMMY_PASSWORD_HASH,
  LOGIN_LOCK_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "@/config/constants";
import { logger } from "@/config/logger";
import type {
  AuthSessionResponseDto,
  LoginRequestDto,
  OtpResendRequestDto,
  OtpVerifyRequestDto,
  RegisterRequestDto,
  RegisterResponseDto,
  UserResponseDto,
} from "@/modules/auth/dto/auth.dto";
import { buildOtpEmail, buildWelcomeEmail } from "@/modules/auth/auth.emails";
import type { AuthRepository } from "@/modules/auth/auth.repository";
import type { OtpService } from "@/modules/auth/otp.service";
import {
  ConflictError,
  ForbiddenError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
} from "@/shared/errors";
import type { IHasher, IMailProvider, ITokenService, MailMessage } from "@/shared/providers";

export interface IssuedSession {
  session: AuthSessionResponseDto;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const INVALID_CREDENTIALS = "Correo o contrasena incorrectos";
const MS_PER_MINUTE = 60 * 1000;

const toUserDto = (user: User): UserResponseDto => ({
  id: user.id,
  email: user.email,
  role: user.role,
  ownerId: user.ownerId,
});

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly otpService: OtpService,
    private readonly hasher: IHasher,
    private readonly tokens: ITokenService,
    private readonly mail: IMailProvider,
    private readonly otpTtlMinutes: number,
  ) {}

  // RN-01 a RN-05, RN-60. Con el correo coincidente se vincula al propietario existente (R-01).
  async register(dto: RegisterRequestDto): Promise<RegisterResponseDto> {
    if (await this.repository.findUserByEmail(dto.email)) {
      throw new ConflictError("El correo ya esta registrado");
    }

    const existingOwner = await this.repository.findOwnerByDocument(dto.documentNumber);
    if (existingOwner?.user) {
      throw new ConflictError("La cedula ya tiene una cuenta registrada");
    }
    if (existingOwner && existingOwner.email?.toLowerCase() !== dto.email) {
      throw new ConflictError(
        "La cedula ya esta registrada en la clinica con otro correo. Acercate a recepcion para actualizarlo",
      );
    }

    const otp = await this.otpService.generate();
    try {
      await this.repository.createAccount({
        email: dto.email,
        passwordHash: await this.hasher.hash(dto.password),
        otpHash: otp.hash,
        otpExpiresAt: otp.expiresAt,
        ownerId: existingOwner?.id ?? null,
        owner: existingOwner
          ? null
          : {
              documentType: dto.documentType,
              documentNumber: dto.documentNumber,
              firstNames: dto.firstNames,
              lastNames: dto.lastNames,
              email: dto.email,
              phone: `${COLOMBIA_PHONE_PREFIX}${dto.phone}`,
              address: dto.address,
              dataConsentAt: new Date(),
            },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("El correo o la cedula ya estan registrados");
      }
      throw error;
    }

    await this.sendSafely(buildOtpEmail(dto.email, otp.code, this.otpTtlMinutes));
    return { email: dto.email, message: "Te enviamos un codigo de verificacion a tu correo" };
  }

  async verifyOtp({ email, code }: OtpVerifyRequestDto): Promise<void> {
    const user = await this.repository.findUserByEmail(email);
    if (!user || user.status !== "PENDING") throw new ValidationError("Codigo invalido o expirado");

    const otpId = await this.otpService.verify(user.id, code);
    await this.repository.activateUser(user.id, otpId);
    await this.sendSafely(buildWelcomeEmail(user.email, user.owner?.firstNames ?? ""));
  }

  async resendOtp({ email }: OtpResendRequestDto): Promise<void> {
    const user = await this.repository.findUserByEmail(email);
    if (!user || user.status !== "PENDING") return;

    await this.otpService.assertResendAllowed(user.id);
    const code = await this.otpService.issue(user.id);
    await this.sendSafely(buildOtpEmail(user.email, code, this.otpTtlMinutes));
  }

  // RN-07 a RN-09.
  async login({ email, password }: LoginRequestDto): Promise<IssuedSession> {
    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      await this.hasher.compare(password, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / MS_PER_MINUTE);
      throw new TooManyRequestsError(
        `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutes} minutos`,
      );
    }

    if (!(await this.hasher.compare(password, user.passwordHash))) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedError(INVALID_CREDENTIALS);
    }

    if (user.status === "PENDING") {
      throw new ForbiddenError("Debes verificar tu correo antes de iniciar sesion");
    }
    if (user.status === "SUSPENDED") {
      throw new ForbiddenError("Tu cuenta esta inactiva. Contacta a la clinica");
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.repository.resetLoginState(user.id);
    }
    return this.issueSession(user);
  }

  // RN-10: el refresh token rota en cada uso; reutilizar uno revocado invalida toda la sesión.
  async refresh(refreshToken: string | undefined): Promise<IssuedSession> {
    if (!refreshToken) throw new UnauthorizedError("Tu sesion expiro");
    const { sub, jti } = this.tokens.verifyRefresh(refreshToken);

    const stored = await this.repository.findRefreshToken(jti);
    if (!stored || stored.userId !== sub) throw new UnauthorizedError("Tu sesion expiro");
    if (stored.revokedAt) {
      await this.repository.revokeAllRefreshTokens(sub);
      throw new UnauthorizedError("Tu sesion expiro");
    }

    const user = await this.repository.findUserById(sub);
    if (!user || user.status !== "ACTIVE") throw new UnauthorizedError("Tu sesion expiro");

    const nextId = randomUUID();
    const next = this.tokens.signRefresh({ sub: user.id, jti: nextId });
    await this.repository.rotateRefreshToken(jti, {
      id: nextId,
      userId: user.id,
      expiresAt: next.expiresAt,
    });

    return {
      session: {
        accessToken: this.tokens.signAccess({ sub: user.id, role: user.role }),
        user: toUserDto(user),
      },
      refreshToken: next.token,
      refreshExpiresAt: next.expiresAt,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const { jti } = this.tokens.verifyRefresh(refreshToken);
      await this.repository.revokeRefreshToken(jti);
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) throw error;
    }
  }

  private async issueSession(user: User): Promise<IssuedSession> {
    const jti = randomUUID();
    const refresh = this.tokens.signRefresh({ sub: user.id, jti });
    await this.repository.createRefreshToken(jti, user.id, refresh.expiresAt);

    return {
      session: {
        accessToken: this.tokens.signAccess({ sub: user.id, role: user.role }),
        user: toUserDto(user),
      },
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
    };
  }

  private async registerFailedAttempt(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await this.repository.registerFailedLogin(user.id, 0, new Date(Date.now() + LOGIN_LOCK_MS));
      return;
    }
    await this.repository.registerFailedLogin(user.id, attempts, null);
  }

  // RN-38: un fallo del correo no revierte la operación de negocio.
  private async sendSafely(message: MailMessage): Promise<void> {
    try {
      await this.mail.send(message);
    } catch (error) {
      logger.error({ err: error, subject: message.subject }, "No se pudo enviar el correo");
    }
  }
}
