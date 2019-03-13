import {SdWebSocketServiceBase, SdWebSocketServerUtil} from "@simplysm/sd-service";
import * as crypto from "crypto";

export class SdCryptoService extends SdWebSocketServiceBase {
  public async encryptAsync(str: string): Promise<string> {
    const config = await SdWebSocketServerUtil.getConfigAsync(this.staticPath, this.request.url);
    const cryptoKey = config["crypto"]["key"];
    return crypto.createHmac("sha256", cryptoKey)
      .update(str)
      .digest("hex");
  }
}
