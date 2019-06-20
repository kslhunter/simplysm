import {Injectable} from "@angular/core";
import {SdServiceProvider} from "./SdServiceProvider";

@Injectable()
export class SdCryptoServiceProvider {
  public constructor(private readonly _service: SdServiceProvider) {
  }

  public async encryptAsync(password: string): Promise<string> {
    return await this._service.sendCommandAsync("SdCryptoService.encryptAsync", [password]);
  }
}
