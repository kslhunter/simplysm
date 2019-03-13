import {SdWebSocketClient} from "@simplysm/sd-service-client";

export class SdCryptoServiceClient {
  public constructor(private readonly _ws: SdWebSocketClient) {
  }

  public async encryptAsync(password: string): Promise<string> {
    return await this._ws.sendAsync("SdCryptoService.encryptAsync", [password]);
  }
}
