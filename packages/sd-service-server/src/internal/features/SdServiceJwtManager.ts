import { SdServiceServer } from "../../SdServiceServer";
import { jwtVerify, SignJWT } from "jose";
import { IAuthTokenPayload } from "../auth/IAuthTokenPayload";

export class SdServiceJwtManager {
  constructor(private readonly _server: SdServiceServer) {}

  async signAsync(payload: IAuthTokenPayload): Promise<string> {
    const jwtSecret = this._server.options.auth?.jwtSecret;
    if (jwtSecret == null) throw new Error("JWT Secret is not defined");

    const secret = new TextEncoder().encode(jwtSecret);

    return await new SignJWT(payload) // Payload 주입
      .setProtectedHeader({ alg: "HS256" }) // 알고리즘 명시 필수
      .setIssuedAt()
      .setExpirationTime("12h") // "12h", "2h" 등 문자열 지원함
      .sign(secret); // 서명
  }

  async verifyAsync(token: string): Promise<IAuthTokenPayload | undefined> {
    const jwtSecret = this._server.options.auth?.jwtSecret;
    if (jwtSecret == null) throw new Error("JWT Secret is not defined");

    const secret = new TextEncoder().encode(this._server.options.auth?.jwtSecret);

    try {
      const { payload } = await jwtVerify(token, secret);
      return payload as any;
    } catch (err) {
      // jose 에러 처리
      if (err.code === "ERR_JWT_EXPIRED") {
        throw new Error("토큰이 만료되었습니다.");
      }
      throw new Error("유효하지 않은 토큰입니다.");
    }
  }
}
