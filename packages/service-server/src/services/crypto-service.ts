import crypto from "crypto";
import { ServiceBase } from "../core/service-base";
import type { CryptoConfig, CryptoService as CryptoServiceType } from "@simplysm/service-common";

export class CryptoService extends ServiceBase implements CryptoServiceType {
  async encrypt(data: string | Buffer): Promise<string> {
    const config = await this._getConf();
    return crypto.createHmac("sha256", config.key).update(data).digest("hex");
  }

  async encryptAes(data: Buffer): Promise<string> {
    const config = await this._getConf();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(config.key), iv);
    const encrypted = cipher.update(data);

    return iv.toString("hex") + ":" + Buffer.concat([encrypted, cipher.final()]).toString("hex");
  }

  async decryptAes(encText: string): Promise<Buffer> {
    const config = await this._getConf();

    const textParts = encText.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(config.key), iv);
    const decrypted = decipher.update(encryptedText);

    return Buffer.concat([decrypted, decipher.final()]);
  }

  private async _getConf() {
    return await this.getConfigAsync<CryptoConfig>("crypto");
  }
}
