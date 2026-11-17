import type {
  DocumentType,
  Owner,
  OtpCode,
  PasswordResetToken,
  Prisma,
  RefreshToken,
  User,
} from "@prisma/client";
import { prisma } from "@/shared/prisma";

export interface NewOwnerData {
  documentType: DocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  email: string;
  phone: string;
  address?: string;
  dataConsentAt: Date;
}

export interface NewAccountData {
  email: string;
  passwordHash: string;
  otpHash: string;
  otpExpiresAt: Date;
  ownerId: string | null;
  owner: NewOwnerData | null;
}

export type OwnerWithUser = Owner & { user: User | null };

export class AuthRepository {
  findUserByEmail(email: string): Promise<(User & { owner: Owner | null }) | null> {
    return prisma.user.findUnique({ where: { email }, include: { owner: true } });
  }

  findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  findOwnerByDocument(documentNumber: string): Promise<OwnerWithUser | null> {
    return prisma.owner.findUnique({ where: { documentNumber }, include: { user: true } });
  }

  createAccount(data: NewAccountData): Promise<User> {
    return prisma.$transaction(async (tx) => {
      const ownerId = data.owner ? (await tx.owner.create({ data: data.owner })).id : data.ownerId;
      return tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          ownerId,
          otpCodes: { create: { codeHash: data.otpHash, expiresAt: data.otpExpiresAt } },
        },
      });
    });
  }

  findLatestOtp(userId: string): Promise<OtpCode | null> {
    return prisma.otpCode.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  findLatestOtpAny(userId: string): Promise<OtpCode | null> {
    return prisma.otpCode.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  incrementOtpAttempts(id: string): Promise<OtpCode> {
    return prisma.otpCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  replaceOtp(userId: string, codeHash: string, expiresAt: Date): Promise<OtpCode> {
    return prisma.$transaction(async (tx) => {
      await tx.otpCode.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      return tx.otpCode.create({ data: { userId, codeHash, expiresAt } });
    });
  }

  activateUser(userId: string, otpId: string): Promise<User> {
    return prisma.$transaction(async (tx) => {
      await tx.otpCode.update({ where: { id: otpId }, data: { usedAt: new Date() } });
      return tx.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
    });
  }

  registerFailedLogin(userId: string, attempts: number, lockedUntil: Date | null): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
  }

  resetLoginState(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  // Un solo enlace vigente por usuario: pedir otro invalida los anteriores.
  createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetToken> {
    return prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      return tx.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
    });
  }

  findPasswordResetToken(tokenHash: string): Promise<(PasswordResetToken & { user: User }) | null> {
    return prisma.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } });
  }

  // Devuelve false si otra petición ya consumió el enlace (uso único, RN-11); el cambio de
  // contraseña, el fin del bloqueo y el cierre de sesiones ocurren juntos o no ocurren.
  resetPassword(tokenId: string, userId: string, passwordHash: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: tokenId, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count === 0) return false;

      await tx.user.update({
        where: { id: userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      return true;
    });
  }

  createRefreshToken(id: string, userId: string, expiresAt: Date): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data: { id, userId, expiresAt } });
  }

  findRefreshToken(id: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { id } });
  }

  rotateRefreshToken(oldId: string, next: { id: string; userId: string; expiresAt: Date }) {
    return prisma.$transaction([
      prisma.refreshToken.update({ where: { id: oldId }, data: { revokedAt: new Date() } }),
      prisma.refreshToken.create({ data: next }),
    ]);
  }

  revokeRefreshToken(id: string): Promise<Prisma.BatchPayload> {
    return prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllRefreshTokens(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
