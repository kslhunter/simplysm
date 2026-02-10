import type { JWTPayload } from "jose";

export interface IAuthTokenPayload<TAuthInfo = any> extends JWTPayload {
  perms: string[];
  data: TAuthInfo;
}
