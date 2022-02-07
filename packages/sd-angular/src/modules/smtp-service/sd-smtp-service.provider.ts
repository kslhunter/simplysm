import { Injectable } from "@angular/core";
import { SdServiceFactoryRootProvider } from "../../root-providers/service";
import { ISmtpClientSendByDefaultOption, ISmtpClientSendOption } from "@simplysm/sd-service-smtp/common";

@Injectable({ providedIn: null })
export class SdSmtpServiceProvider {
  public constructor(private readonly _service: SdServiceFactoryRootProvider) {
  }

  public async sendAsync(serviceKey: string, options: ISmtpClientSendOption): Promise<void> {
    const service = this._service.get(serviceKey);
    await service.sendAsync("SdSmtpClientService", "sendAsync", [options]);
  }

  public async sendByConfigAsync(serviceKey: string, configName: string, options: ISmtpClientSendByDefaultOption): Promise<void> {
    const service = this._service.get(serviceKey);
    await service.sendAsync("SdSmtpClientService", "sendByConfigAsync", [configName, options]);
  }
}
