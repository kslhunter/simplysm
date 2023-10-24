import {SdServiceClient} from "../SdServiceClient";
import {ISmtpClientSendByDefaultOption, ISmtpClientSendOption} from "@simplysm/sd-service-common";

export class SdSmtpClientServiceClient {
  constructor(private readonly _client: SdServiceClient) {
  }

  async send(options: ISmtpClientSendOption): Promise<void> {
    await this._client.sendAsync("SdSmtpClientService", "send", [options]);
  }

  async sendByConfig(configName: string, options: ISmtpClientSendByDefaultOption): Promise<void> {
    await this._client.sendAsync("SdSmtpClientService", "sendByConfig", [configName, options]);
  }
}
