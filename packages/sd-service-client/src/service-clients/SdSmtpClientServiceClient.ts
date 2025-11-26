import { SdServiceClient } from "../SdServiceClient";
import {
  ISdSmtpClientService,
  ISmtpClientSendByDefaultOption,
  ISmtpClientSendOption,
} from "@simplysm/sd-service-common";
import { SdServiceClientBase } from "../SdServiceClientBase";

export class SdSmtpClientServiceClient extends SdServiceClientBase<ISdSmtpClientService> {
  constructor(client: SdServiceClient) {
    super(client, "SdSmtpClientService");
  }

  async send(options: ISmtpClientSendOption): Promise<string> {
    return await this.call("send", [options]);
  }

  async sendByConfig(configName: string, options: ISmtpClientSendByDefaultOption): Promise<string> {
    return await this.call("sendByConfig", [configName, options]);
  }
}
