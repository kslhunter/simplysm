import {SdWebSocketServiceBase} from "../SdWebSocketServiceBase";
import * as crypto from "crypto";
import {SdWebSocketServerUtil} from "../SdWebSocketServerUtil";

export class CryptoService extends SdWebSocketServiceBase {
  public async encryptAsync(str: string): Promise<string> {
    const config = await SdWebSocketServerUtil.getConfigAsync(this.request.url);
    const cryptoKey = config["crypto"]["key"];
    return crypto.createHmac("sha256", cryptoKey)
      .update(str)
      .digest("hex");
  }
}
