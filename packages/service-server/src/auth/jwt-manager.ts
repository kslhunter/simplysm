import type { ServiceServer } from "../service-server";
import * as jose from "jose";
import type { IAuthTokenPayload } from "./auth-token-payload";

export class JwtManager<TAuthInfo = unknown> {
  constructor(private readonly _server: ServiceServer<TAuthInfo>) {}

  async signAsync(payload: IAuthTokenPayload<TAuthInfo>): Promise<string> {
    const jwtSecret = this._server.options.auth?.jwtSecret;
    if (jwtSecret == null) throw new Error("JWT Secret is not defined");

    const secret = new TextEncoder().encode(jwtSecret);

    return await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(secret);
  }

  async verifyAsync(token: string): Promise<IAuthTokenPayload<TAuthInfo>> {
    const jwtSecret = this._server.options.auth?.jwtSecret;
    if (jwtSecret == null) throw new Error("JWT Secret is not defined");

    const secret = new TextEncoder().encode(jwtSecret);

    try {
      const { payload } = await jose.jwtVerify(token, secret);
      return payload as IAuthTokenPayload<TAuthInfo>;
    } catch (err) {
      if (err != null && typeof err === "object" && "code" in err && err.code === "ERR_JWT_EXPIRED") {
        throw new Error("토큰이 만료되었습니다.");
      }
      throw new Error("유효하지 않은 토큰입니다.");
    }
  }

  decode(token: string): IAuthTokenPayload<TAuthInfo> {
    const jwtSecret = this._server.options.auth?.jwtSecret;
    if (jwtSecret == null) throw new Error("JWT Secret is not defined");

    return jose.decodeJwt(token) as IAuthTokenPayload<TAuthInfo>;
  }
}
