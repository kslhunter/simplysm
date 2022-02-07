import * as crypto from "crypto";
import { SdServiceBase } from "../SdServiceBase";
import { SdServiceServerConfigUtil } from "../SdServiceServerConfigUtil";

export class SdCryptoService extends SdServiceBase {
  public async encryptAsync(data: string | Buffer): Promise<string> {
    const config = (
      await SdServiceServerConfigUtil.getConfigAsync(this.server.options.rootPath, this.socket.request.url)
    )["crypto"];
    if (config === undefined) {
      throw new Error("암호화 설정을 찾을 수 없습니다.");
    }

    return crypto.createHmac("sha256", config.key)
      .update(data)
      .digest("hex");
  }
}
