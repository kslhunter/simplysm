import type { JWTPayload } from "jose";

export interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  perms: string[];
  data: TAuthInfo;
}
