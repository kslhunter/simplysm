import { Injectable } from "@angular/core";
import { SdServiceFactoryProvider } from "./SdServiceFactoryProvider";

@Injectable({ providedIn: null })
export class SdCryptoServiceProvider {
  public constructor(private readonly _service: SdServiceFactoryProvider) {
  }

  public async encryptAsync(serviceKey: string, pwd: string): Promise<string> {
    const service = this._service.get(serviceKey);
    return await service.sendCommandAsync("SdCryptoService.encryptAsync", [pwd]);
  }
}