import jwt, { type SignOptions } from "jsonwebtoken";
import { JWT_ALGORITHM } from "@/config/constants";
import { UnauthorizedError } from "@/shared/errors";
import type {
  AccessTokenPayload,
  ITokenService,
  RefreshTokenPayload,
  SignedRefreshToken,
} from "@/shared/providers/token-service.interface";

interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
}

const SESSION_EXPIRED_MESSAGE = "Tu sesion expiro";
const MS_PER_SECOND = 1000;

export class JwtTokenService implements ITokenService {
  constructor(private readonly config: JwtConfig) {}

  signAccess({ sub, role }: AccessTokenPayload): string {
    return jwt.sign({ role }, this.config.accessSecret, {
      algorithm: JWT_ALGORITHM,
      subject: sub,
      expiresIn: this.config.accessTtl as SignOptions["expiresIn"],
    });
  }

  verifyAccess(token: string): AccessTokenPayload {
    const decoded = this.verify(token, this.config.accessSecret);
    if (typeof decoded.sub !== "string" || typeof decoded.role !== "string") {
      throw new UnauthorizedError(SESSION_EXPIRED_MESSAGE);
    }
    return { sub: decoded.sub, role: decoded.role };
  }

  signRefresh({ sub, jti }: RefreshTokenPayload): SignedRefreshToken {
    const token = jwt.sign({}, this.config.refreshSecret, {
      algorithm: JWT_ALGORITHM,
      subject: sub,
      jwtid: jti,
      expiresIn: this.config.refreshTtl as SignOptions["expiresIn"],
    });
    const { exp } = jwt.decode(token) as { exp: number };
    return { token, expiresAt: new Date(exp * MS_PER_SECOND) };
  }

  verifyRefresh(token: string): RefreshTokenPayload {
    const decoded = this.verify(token, this.config.refreshSecret);
    if (typeof decoded.sub !== "string" || typeof decoded.jti !== "string") {
      throw new UnauthorizedError(SESSION_EXPIRED_MESSAGE);
    }
    return { sub: decoded.sub, jti: decoded.jti };
  }

  private verify(token: string, secret: string): jwt.JwtPayload {
    try {
      const decoded = jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] });
      if (typeof decoded === "string") throw new UnauthorizedError(SESSION_EXPIRED_MESSAGE);
      return decoded;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      throw new UnauthorizedError(SESSION_EXPIRED_MESSAGE);
    }
  }
}
