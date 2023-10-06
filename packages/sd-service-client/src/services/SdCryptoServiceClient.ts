import {SdServiceClient} from "../SdServiceClient";

export class SdCryptoServiceClient {
  public constructor(private readonly _client: SdServiceClient) {
  }

  public async encryptAsync(data: string | Buffer): Promise<string> {
    return await this._client.sendAsync("SdCryptoService", "encryptAsync", [data]);
  }

  public async encryptAesAsync(data: Buffer): Promise<string> {
    return await this._client.sendAsync("SdCryptoService", "encryptAesAsync", [data]);

  }

  public async decryptAesAsync(encText: string): Promise<Buffer> {
    return await this._client.sendAsync("SdCryptoService", "decryptAesAsync", [encText]);
  }
}
