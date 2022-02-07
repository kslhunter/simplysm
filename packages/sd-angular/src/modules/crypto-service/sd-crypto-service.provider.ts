import { Injectable } from "@angular/core";
import { SdServiceFactoryRootProvider } from "../../root-providers/service";

@Injectable({ providedIn: null })
export class SdCryptoServiceProvider {
  public constructor(private readonly _service: SdServiceFactoryRootProvider) {
  }

  public async encryptAsync(serviceKey: string, data: string | Buffer): Promise<string> {
    const service = this._service.get(serviceKey);
    return await service.sendAsync("SdCryptoService", "encryptAsync", [data]);
  }
}
