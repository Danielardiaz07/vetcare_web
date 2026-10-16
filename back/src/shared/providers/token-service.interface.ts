export interface AccessTokenPayload {
  sub: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export interface ITokenService {
  signAccess(payload: AccessTokenPayload): string;
  verifyAccess(token: string): AccessTokenPayload;
  signRefresh(payload: RefreshTokenPayload): string;
  verifyRefresh(token: string): RefreshTokenPayload;
}
