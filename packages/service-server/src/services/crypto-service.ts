import crypto from "crypto";
import { BytesUtils } from "@simplysm/core-common";
import { ServiceBase } from "../core/service-base";
import type { CryptoConfig, CryptoService as CryptoServiceType } from "@simplysm/service-common";

export class CryptoService extends ServiceBase implements CryptoServiceType {
  async encrypt(data: string | Uint8Array): Promise<string> {
    const config = await this._getConf();
    return crypto.createHmac("sha256", config.key).update(data).digest("hex");
  }

  async encryptAes(data: Uint8Array): Promise<string> {
    const config = await this._getConf();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", config.key, iv);
    const encrypted = cipher.update(data);

    return BytesUtils.toHex(iv) + ":" + BytesUtils.toHex(BytesUtils.concat([encrypted, cipher.final()]));
  }

  async decryptAes(encText: string): Promise<Uint8Array> {
    const config = await this._getConf();

    const textParts = encText.split(":");
    const iv = BytesUtils.fromHex(textParts.shift()!);
    const encryptedText = BytesUtils.fromHex(textParts.join(":"));
    const decipher = crypto.createDecipheriv("aes-256-cbc", config.key, iv);
    const decrypted = decipher.update(encryptedText);

    return BytesUtils.concat([decrypted, decipher.final()]);
  }

  private async _getConf() {
    return this.getConfigAsync<CryptoConfig>("crypto");
  }
}
