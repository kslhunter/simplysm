import {SdServiceClient} from "../sd-service-client";

export class SdCryptoServiceClient {
  public constructor(private readonly _client: SdServiceClient) {
  }

  public async encrypt(data: string | Buffer): Promise<string> {
    return await this._client.sendAsync("SdCryptoService", "encrypt", [data]);
  }

  public async encryptAes(data: Buffer): Promise<string> {
    return await this._client.sendAsync("SdCryptoService", "encryptAes", [data]);

  }

  public async decryptAes(encText: string): Promise<Buffer> {
    return await this._client.sendAsync("SdCryptoService", "decryptAes", [encText]);
  }
}
