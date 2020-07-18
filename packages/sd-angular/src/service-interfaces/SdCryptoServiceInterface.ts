import { SdNgServiceClient } from "../providers/SdServiceFactoryProvider";

export class SdCryptoServiceInterface {
  public constructor(private readonly _service: SdNgServiceClient) {
  }

  public async encryptAsync(password: string): Promise<string> {
    return await this._service.sendCommandAsync("SdCryptoService.encryptAsync", [password]);
  }
}