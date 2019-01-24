import {Injectable} from "@angular/core";
import {SdWebSocketProvider} from "./SdWebSocketProvider";

@Injectable()
export class SdCryptoProvider {
  public constructor(private readonly _ws: SdWebSocketProvider) {
  }

  public async encryptAsync(password: string): Promise<string> {
    return await this._ws.sendAsync("CryptoService.encryptAsync", [password]);
  }
}
