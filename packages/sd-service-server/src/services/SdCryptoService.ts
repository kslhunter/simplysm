import crypto from "crypto";
import { SdServiceBase } from "../types";
import { ICryptoConfig, ISdCryptoService } from "@simplysm/sd-service-common";

export class SdCryptoService extends SdServiceBase implements ISdCryptoService {
  async encrypt(data: string | Buffer): Promise<string> {
    const config = await this.#getConf();
    // HMAC은 단방향 무결성 검증용이므로 기존 유지 (필요시 변경 가능)
    return crypto.createHmac("sha256", config.key).update(data).digest("hex");
  }

  async encryptAes(data: Buffer): Promise<string> {
    const config = await this.#getConf();

    // [New Standard] AES-256-GCM
    // GCM 권장 IV 길이는 12바이트 (96비트)
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(config.key), iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag(); // GCM은 인증 태그가 생성됨

    // 포맷: IV:AuthTag:EncryptedData
    return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex");
  }

  async decryptAes(encText: string): Promise<Buffer> {
    const config = await this.#getConf();
    const textParts = encText.split(":");

    // [Case 1] AES-256-GCM (신규 데이터)
    // 포맷: IV(0):AuthTag(1):EncryptedData(2)
    if (textParts.length === 3) {
      const iv = Buffer.from(textParts[0], "hex");
      const authTag = Buffer.from(textParts[1], "hex");
      const encryptedText = Buffer.from(textParts[2], "hex");

      const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(config.key), iv);
      decipher.setAuthTag(authTag); // 태그 설정 (검증 실패 시 에러 발생)

      return Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    }
    // [Case 2] AES-256-CBC (기존 데이터 - Legacy Support)
    // 포맷: IV(0):EncryptedData(1)
    else if (textParts.length === 2) {
      const iv = Buffer.from(textParts[0], "hex");
      const encryptedText = Buffer.from(textParts[1], "hex");

      const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(config.key), iv);

      return Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    }
    // [Case 3] 알 수 없는 포맷
    else {
      throw new Error("Invalid encrypted text format");
    }
  }

  async #getConf() {
    return await this.getConfig<ICryptoConfig>("crypto");
  }
}
