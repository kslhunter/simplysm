import { SdServiceClient } from "../SdServiceClient";

export class SdAutoUpdateServiceClient {
  constructor(private readonly _client: SdServiceClient) {}

  async getLastVersion(platform: string): Promise<
    | {
        version: string;
        downloadPath: string;
      }
    | undefined
  > {
    return await this._client.sendAsync("SdAutoUpdateService", "getLastVersion", [platform, true]);
  }
}
