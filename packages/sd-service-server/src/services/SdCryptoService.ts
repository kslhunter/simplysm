import crypto from "crypto";
import {SdServiceServerConfigUtil} from "../utils/SdServiceServerConfigUtil";
import {SdServiceBase} from "../commons";
import {ICryptoConfig} from "@simplysm/sd-service-common";

export class SdCryptoService extends SdServiceBase {
  public async encryptAsync(data: string | Buffer): Promise<string> {
    const config = (
      await SdServiceServerConfigUtil.getConfigAsync(this.server.options.rootPath, this.request?.clientName)
    )["crypto"] as ICryptoConfig | undefined;
    if (config === undefined) {
      throw new Error("암호화 설정을 찾을 수 없습니다.");
    }

    return crypto.createHmac("sha256", config.key)
      .update(data)
      .digest("hex");
  }

  public async encryptAesAsync(data: Buffer): Promise<string> {
    const config = (
      await SdServiceServerConfigUtil.getConfigAsync(this.server.options.rootPath, this.request?.clientName)
    )["crypto"] as ICryptoConfig | undefined;
    if (config === undefined) {
      throw new Error("암호화 설정을 찾을 수 없습니다.");
    }

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

  public async decryptAesAsync(encText: string): Promise<Buffer> {
    const config = (
      await SdServiceServerConfigUtil.getConfigAsync(this.server.options.rootPath, this.request?.clientName)
    )["crypto"] as ICryptoConfig | undefined;
    if (config === undefined) {
      throw new Error("암호화 설정을 찾을 수 없습니다.");
    }

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
}
