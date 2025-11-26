import { SdServiceClient } from "../SdServiceClient";
import { SdServiceClientBase } from "../types/SdServiceClientBase";
import { ISdAutoUpdateService } from "@simplysm/sd-service-common";

export class SdAutoUpdateServiceClient extends SdServiceClientBase<ISdAutoUpdateService> {
  constructor(client: SdServiceClient) {
    super(client, "SdAutoUpdateService");
  }

  async getLastVersion(platform: string): Promise<
    | {
        version: string;
        downloadPath: string;
      }
    | undefined
  > {
    return await this.call("getLastVersion", [platform, true]);
  }
}
