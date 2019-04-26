import { Injectable } from "@angular/core";
import { ISmtpClientSendDefaultOption, ISmtpClientSendOption } from "@simplysm/sd-smtp-client-common";
import { SdServiceProvider } from "./SdServiceProvider";

@Injectable()
export class SdSmtpClientServiceProvider {
  public constructor(private readonly _service: SdServiceProvider) {}

  public async sendAsync(options: ISmtpClientSendOption): Promise<void> {
    await this._service.sendAsync("SdSmtpClientService.sendAsync", [options]);
  }

  public async sendDefaultAsync(options: ISmtpClientSendDefaultOption): Promise<void> {
    await this._service.sendAsync("SdSmtpClientService.sendDefaultAsync", [options]);
  }
}
