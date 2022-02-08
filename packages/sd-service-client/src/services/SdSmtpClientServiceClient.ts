import { SdServiceClient } from "../SdServiceClient";
import { ISmtpClientSendByDefaultOption, ISmtpClientSendOption } from "@simplysm/sd-service-common";

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
