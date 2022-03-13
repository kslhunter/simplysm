import { SdServiceClient } from "../SdServiceClient";

export class SdAutoUpdateServiceClient {
  public constructor(private readonly _client: SdServiceClient) {
  }

  public async getLastVersionAsync(clientName: string, platform: string): Promise<string | undefined> {
    return await this._client.sendAsync("AutoUpdateService", "getLastVersionAsync", [clientName, platform]);
  }

  public async getVersionArchiveBufferAsync(clientName: string, platform: string, version: string): Promise<Buffer> {
    return await this._client.sendAsync("AutoUpdateService", "getVersionArchiveBufferAsync", [clientName, platform, version]);
  }
}
