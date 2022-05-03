import { ISmtpClientSendByDefaultOption, ISmtpClientSendOption } from "../common";
import { SdServiceClient } from "@simplysm/sd-service/client";

export class SdSmtpClientServiceClient {
  public constructor(private readonly _client: SdServiceClient) {
  }

  public async sendAsync(options: ISmtpClientSendOption): Promise<void> {
    await this._client.sendAsync("SdSmtpClientService", "sendAsync", [options]);
  }

  public async sendByConfigAsync(configName: string, options: ISmtpClientSendByDefaultOption): Promise<void> {
    await this._client.sendAsync("SdSmtpClientService", "endByConfigAsync", [configName, options]);
  }
}
