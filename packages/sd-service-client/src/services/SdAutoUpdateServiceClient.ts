import {SdServiceClient} from "../SdServiceClient";

export class SdAutoUpdateServiceClient {
  constructor(private readonly _client: SdServiceClient) {
  }

  async getLastVersion(clientName: string, platform: string): Promise<{
    version: string;
    downloadPath: string;
  }> {
    return await this._client.sendAsync("SdAutoUpdateService", "getLastVersion", [clientName, platform]);
  }
}