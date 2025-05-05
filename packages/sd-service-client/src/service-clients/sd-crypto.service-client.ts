import {SdServiceClient} from "../sd-service-client";

export class SdCryptoServiceClient {
  constructor(private readonly _client: SdServiceClient) {
  }

  async encrypt(data: string | Buffer): Promise<string> {
    return await this._client.sendAsync("SdCryptoService", "encrypt", [data]);
  }

  async encryptAes(data: Buffer): Promise<string> {
    return await this._client.sendAsync("SdCryptoService", "encryptAes", [data]);

  }

  async decryptAes(encText: string): Promise<Buffer> {
    return await this._client.sendAsync("SdCryptoService", "decryptAes", [encText]);
  }
}
