import { randomInt } from "node:crypto";
import { OTP_LENGTH, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS } from "@/config/constants";
import { TooManyRequestsError, ValidationError } from "@/shared/errors";
import type { IHasher } from "@/shared/providers";
import type { AuthRepository } from "@/modules/auth/auth.repository";

const OTP_RANGE = 10 ** OTP_LENGTH;
const MS_PER_MINUTE = 60 * 1000;
const INVALID_OTP_MESSAGE = "Codigo invalido o expirado";

export interface GeneratedOtp {
  code: string;
  hash: string;
  expiresAt: Date;
}

export class OtpService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly hasher: IHasher,
    private readonly ttlMinutes: number,
  ) {}

  async generate(): Promise<GeneratedOtp> {
    const code = randomInt(OTP_RANGE).toString().padStart(OTP_LENGTH, "0");
    return {
      code,
      hash: await this.hasher.hash(code),
      expiresAt: new Date(Date.now() + this.ttlMinutes * MS_PER_MINUTE),
    };
  }

  async issue(userId: string): Promise<string> {
    const { code, hash, expiresAt } = await this.generate();
    await this.repository.replaceOtp(userId, hash, expiresAt);
    return code;
  }

  async assertResendAllowed(userId: string): Promise<void> {
    const latest = await this.repository.findLatestOtpAny(userId);
    if (latest && Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      throw new TooManyRequestsError("Espera un momento antes de solicitar otro codigo");
    }
  }

  async verify(userId: string, code: string): Promise<string> {
    const otp = await this.repository.findLatestOtp(userId);
    if (!otp || otp.expiresAt.getTime() <= Date.now() || otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new ValidationError(INVALID_OTP_MESSAGE);
    }

    if (!(await this.hasher.compare(code, otp.codeHash))) {
      await this.repository.incrementOtpAttempts(otp.id);
      throw new ValidationError(INVALID_OTP_MESSAGE);
    }
    return otp.id;
  }
}
