import { SdConfigManager } from "../internal/SdConfigManager";
import path from "path";
import jwt, { SignOptions } from "jsonwebtoken";

export abstract class SdServiceJwt {
  static async signAsync(payload: any, options?: SignOptions) {
    const secret = await this._getSecretAsync();
    return jwt.sign(payload, secret, options);
  }

  static async verifyAsync(token: string) {
    const secret = await this._getSecretAsync();

    // 2. 토큰 검증
    return await new Promise((resolve, reject) => {
      jwt.verify(token, secret, (err, decoded) => {
        if (err != null) {
          // 에러 메시지를 명확하게 변환
          if (err.name === "TokenExpiredError") {
            reject(new Error("토큰이 만료되었습니다. 다시 로그인해주세요."));
          } else if (err.name === "JsonWebTokenError") {
            reject(new Error("유효하지 않은 토큰입니다."));
          } else {
            reject(new Error("인증 실패: " + err.message));
          }
        } else {
          // 3. 검증 성공 시 Payload 반환
          resolve(decoded);
        }
      });
    });
  }

  private static async _getSecretAsync() {
    const config = await SdConfigManager.getConfigAsync<{ jwt?: { secret?: string } }>(
      path.resolve(process.cwd(), ".config.json"),
    );

    if (config?.jwt?.secret == null) {
      throw new Error("서버에 JWT 비밀키(secret) 설정이 없습니다.");
    }

    return config.jwt.secret;
  }
}
