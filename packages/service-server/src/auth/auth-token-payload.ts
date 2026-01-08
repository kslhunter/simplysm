import type { JWTPayload } from "jose";

export interface IAuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  perms: string[];
  data: TAuthInfo;
}
