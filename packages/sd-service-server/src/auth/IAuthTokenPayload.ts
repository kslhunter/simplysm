import { JWTPayload } from "jose";

export interface IAuthTokenPayload extends JWTPayload {
  perms: string[];
  data: any;
}
