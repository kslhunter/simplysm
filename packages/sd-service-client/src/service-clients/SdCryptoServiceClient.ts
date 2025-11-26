import { SdServiceClient } from "../SdServiceClient";
import { SdServiceClientBase } from "../types/SdServiceClientBase";
import { ISdCryptoService } from "@simplysm/sd-service-common";

export class SdCryptoServiceClient extends SdServiceClientBase<ISdCryptoService> {
  constructor(client: SdServiceClient) {
    super(client, "SdCryptoService");
  }

  async encrypt(data: string | Buffer): Promise<string> {
    return await this.call("encrypt", [data]);
  }

  async encryptAes(data: Buffer): Promise<string> {
    return await this.call("encryptAes", [data]);
  }

  async decryptAes(encText: string): Promise<Buffer> {
    return await this.call("decryptAes", [encText]);
  }
}
