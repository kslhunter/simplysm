import type { JWTPayload } from "jose";

export interface AuthTokenPayload<TAuthInfo = unknown> extends JWTPayload {
  roles: string[];
  data: TAuthInfo;
}
