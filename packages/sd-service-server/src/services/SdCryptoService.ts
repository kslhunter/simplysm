import crypto from "crypto";
import { SdServiceBase } from "../types";
import { ICryptoConfig, ISdCryptoService } from "@simplysm/sd-service-common";

export class SdCryptoService extends SdServiceBase implements ISdCryptoService {
  async encrypt(data: string | Buffer): Promise<string> {
    const config = await this.#getConf();
    return crypto.createHmac("sha256", config.key).update(data).digest("hex");
  }

  async encryptAes(data: Buffer): Promise<string> {
    const config = await this.#getConf();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(config.key), iv);
    const encrypted = cipher.update(data);

    return iv.toString("hex") + ":" + Buffer.concat([encrypted, cipher.final()]).toString("hex");
  }

  async decryptAes(encText: string): Promise<Buffer> {
    const config = await this.#getConf();

    const textParts = encText.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(config.key), iv);
    const decrypted = decipher.update(encryptedText);

    return Buffer.concat([decrypted, decipher.final()]);
  }

  async #getConf() {
    return await this.getConfig<ICryptoConfig>("crypto");
  }
}
