import type { SdServiceServer } from "../SdServiceServer";
import * as jose from "jose";
import type { IAuthTokenPayload } from "./IAuthTokenPayload";

export class SdServiceJwtManager<TAuthInfo = any> {
  constructor(private readonly _server: SdServiceServer<TAuthInfo>) {}

  async signAsync(payload: IAuthTokenPayload<TAuthInfo>): Promise<string> {
    const jwtSecret = this._server.options.auth?.jwtSecret;
    if (jwtSecret == null) throw new Error("JWT Secret is not defined");

    const secret = new TextEncoder().encode(jwtSecret);

    return await new jose.SignJWT(payload) // Payload 주입
      .setProtectedHeader({ alg: "HS256" }) // 알고리즘 명시 필수
      .setIssuedAt()
      .setExpirationTime("12h") // "12h", "2h" 등 문자열 지원함
      .sign(secret); // 서명
  }

  async verifyAsync(token: string): Promise<IAuthTokenPayload<TAuthInfo>> {
    const jwtSecret = this._server.options.auth?.jwtSecret;
    if (jwtSecret == null) throw new Error("JWT Secret is not defined");

    const secret = new TextEncoder().encode(this._server.options.auth?.jwtSecret);

    try {
      const { payload } = await jose.jwtVerify(token, secret);
      return payload as any;
    } catch (err) {
      // jose 에러 처리
      if (
        err != null &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "ERR_JWT_EXPIRED"
      ) {
        throw new Error("토큰이 만료되었습니다.");
      }
      throw new Error("유효하지 않은 토큰입니다.");
    }
  }

  async decodeAsync(token: string): Promise<IAuthTokenPayload<TAuthInfo>> {
    const jwtSecret = this._server.options.auth?.jwtSecret;
    if (jwtSecret == null) throw new Error("JWT Secret is not defined");

    return await jose.decodeJwt(token);
  }
}
