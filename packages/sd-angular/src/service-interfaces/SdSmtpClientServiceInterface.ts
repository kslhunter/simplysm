import { ISmtpClientSendByDefaultOption, ISmtpClientSendOption } from "@simplysm/sd-service-common";
import { SdNgServiceClient } from "../providers/SdServiceFactoryProvider";

export class SdSmtpClientServiceInterface {
  public constructor(private readonly _service: SdNgServiceClient) {
  }

  public async sendAsync(options: ISmtpClientSendOption): Promise<void> {
    await this._service.sendCommandAsync("SdSmtpClientService.sendAsync", [options]);
  }

  public async sendByConfigAsync(configName: string, options: ISmtpClientSendByDefaultOption): Promise<void> {
    await this._service.sendCommandAsync("SdSmtpClientService.sendByConfigAsync", [configName, options]);
  }
}
