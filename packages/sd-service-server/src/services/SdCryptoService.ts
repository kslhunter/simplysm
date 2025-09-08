import crypto from "crypto";
import { SdServiceBase } from "../types";
import { ICryptoConfig } from "@simplysm/sd-service-common";

export class SdCryptoService extends SdServiceBase {
  encrypt(data: string | Buffer): string {
    const config = this.#getConf();

    return crypto.createHmac("sha256", config.key)
      .update(data)
      .digest("hex");
  }

  encryptAes(data: Buffer): string {
    const config = this.#getConf();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(config.key),
      iv,
    );
    const encrypted = cipher.update(data);

    return (
      iv.toString("hex") +
      ":" +
      Buffer.concat([encrypted, cipher.final()]).toString("hex")
    );
  }

  decryptAes(encText: string): Buffer {
    const config = this.#getConf();

    const textParts = encText.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(config.key),
      iv,
    );
    const decrypted = decipher.update(encryptedText);

    return Buffer.concat([decrypted, decipher.final()]);
  }

  #getConf() {
    const config = this.server.getConfig(this.request?.clientName)["crypto"] as ICryptoConfig | undefined;
    if (config === undefined) {
      throw new Error("암호화 설정을 찾을 수 없습니다.");
    }
    return config;
  }
}
