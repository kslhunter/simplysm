import * as crypto from "crypto";
import { SdServiceBase } from "../SdServiceBase";
import { SdServiceServerConfigUtils } from "../SdServiceServerConfigUtils";

export class SdCryptoService extends SdServiceBase {
  public async encryptAsync(str: string): Promise<string> {
    const config = (
      await SdServiceServerConfigUtils.getConfigAsync(this.server.rootPath, this.request.url)
    )?.["crypto"];
    if (config === undefined) {
      throw new Error("암호화 설정을 찾을 수 없습니다.");
    }

    return crypto.createHmac("sha256", config.key)
      .update(str)
      .digest("hex");
  }
}
