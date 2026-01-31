import type { Bytes } from "@simplysm/core-common";
import { bytesConcat, bytesToHex, bytesFromHex } from "@simplysm/core-common";
import type { CryptoConfig, CryptoService as CryptoServiceType } from "@simplysm/service-common";
import crypto from "crypto";
import { ServiceBase } from "../core/service-base";

export class CryptoService extends ServiceBase implements CryptoServiceType {
  async encrypt(data: string | Bytes): Promise<string> {
    const config = await this._getConf();
    return crypto.createHmac("sha256", config.key).update(data).digest("hex");
  }

  async encryptAes(data: Bytes): Promise<string> {
    const config = await this._getConf();

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", config.key, iv);
    const encrypted = cipher.update(data);

    return bytesToHex(iv) + ":" + bytesToHex(bytesConcat([encrypted, cipher.final()]));
  }

  async decryptAes(encText: string): Promise<Bytes> {
    const config = await this._getConf();

    const textParts = encText.split(":");
    const iv = bytesFromHex(textParts.shift()!);
    const encryptedText = bytesFromHex(textParts.join(":"));
    const decipher = crypto.createDecipheriv("aes-256-cbc", config.key, iv);
    const decrypted = decipher.update(encryptedText);

    return bytesConcat([decrypted, decipher.final()]);
  }

  private async _getConf() {
    return this.getConfigAsync<CryptoConfig>("crypto");
  }
}
