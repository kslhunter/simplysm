import { Injectable } from "@angular/core";
import { ISmtpClientSendByDefaultOption, ISmtpClientSendOption } from "@simplysm/sd-service-common";
import { SdServiceFactoryProvider } from "./SdServiceFactoryProvider";

@Injectable({ providedIn: null })
export class SdSmtpServiceProvider {
  public constructor(private readonly _service: SdServiceFactoryProvider) {
  }

  public async sendAsync(serviceKey: string, options: ISmtpClientSendOption): Promise<void> {
    const service = this._service.get(serviceKey);
    await service.sendCommandAsync("SdSmtpClientService.sendAsync", [options]);
  }

  public async sendByConfigAsync(serviceKey: string, configName: string, options: ISmtpClientSendByDefaultOption): Promise<void> {
    const service = this._service.get(serviceKey);
    await service.sendCommandAsync("SdSmtpClientService.sendByConfigAsync", [configName, options]);
  }
}
