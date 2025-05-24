import { SdServiceClient } from "../sd-service-client";

export class SdAutoUpdateServiceClient {
  constructor(private readonly _client: SdServiceClient) {
  }

  async getLastVersion(platform: string): Promise<{
    version: string;
    downloadPath: string;
  } | undefined> {
    return await this._client.sendAsync("SdAutoUpdateService", "getLastVersion", [platform, true]);
  }
}
