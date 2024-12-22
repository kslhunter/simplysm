import { SdClient } from "../sd-client";

export class SdAutoUpdateServiceClient {
  constructor(private readonly _client: SdClient) {
  }

  async getLastVersion(platform: string): Promise<{
    version: string;
    downloadPath: string;
  } | undefined> {
    return await this._client.sendAsync("SdAutoUpdateService", "getLastVersion", [platform]);
  }
}