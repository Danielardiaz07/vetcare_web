import type { CookieOptions, Request, RequestHandler, Response } from "express";
import { HttpStatus, REFRESH_COOKIE_NAME } from "@/config/constants";
import { env } from "@/config/env";
import type { IssuedSession, AuthService } from "@/modules/auth/auth.service";
import type {
  LoginRequestDto,
  OtpResendRequestDto,
  OtpVerifyRequestDto,
  RegisterRequestDto,
} from "@/modules/auth/dto/auth.dto";
import { readCookie } from "@/shared/utils/cookies";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register: RequestHandler = async (req, res) => {
    const result = await this.service.register(req.body as RegisterRequestDto);
    res.status(HttpStatus.CREATED).json(result);
  };

  verifyOtp: RequestHandler = async (req, res) => {
    await this.service.verifyOtp(req.body as OtpVerifyRequestDto);
    res.status(HttpStatus.NO_CONTENT).send();
  };

  resendOtp: RequestHandler = async (req, res) => {
    await this.service.resendOtp(req.body as OtpResendRequestDto);
    res.status(HttpStatus.NO_CONTENT).send();
  };

  login: RequestHandler = async (req, res) => {
    this.respondWithSession(res, await this.service.login(req.body as LoginRequestDto));
  };

  refresh: RequestHandler = async (req, res) => {
    this.respondWithSession(res, await this.service.refresh(this.refreshTokenOf(req)));
  };

  logout: RequestHandler = async (req, res) => {
    await this.service.logout(this.refreshTokenOf(req));
    res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions);
    res.status(HttpStatus.NO_CONTENT).send();
  };

  private refreshTokenOf(req: Request): string | undefined {
    return readCookie(req, REFRESH_COOKIE_NAME);
  }

  private respondWithSession(res: Response, issued: IssuedSession): void {
    res.cookie(REFRESH_COOKIE_NAME, issued.refreshToken, {
      ...baseCookieOptions,
      expires: issued.refreshExpiresAt,
    });
    res.json(issued.session);
  }
}
