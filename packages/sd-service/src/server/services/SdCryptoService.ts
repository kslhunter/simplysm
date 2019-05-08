import * as crypto from "crypto";
import {SdServiceBase} from "../SdServiceBase";
import {SdServiceServerUtil} from "../SdServiceServerUtil";
import {ISdServiceCryptoConfig} from "../../commons";

export class SdCryptoService extends SdServiceBase {
  public async encryptAsync(str: string): Promise<string> {
    const config = (await SdServiceServerUtil.getConfigAsync(this.rootPath, this.request.url))["crypto"] as ISdServiceCryptoConfig;
    return crypto.createHmac("sha256", config.key)
      .update(str)
      .digest("hex");
  }
}
