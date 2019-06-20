import {Injectable} from "@angular/core";
import {SdServiceProvider} from "./SdServiceProvider";
import {ISmtpClientSendByDefaultOption, ISmtpClientSendOption} from "@simplysm/sd-smtp-client";

@Injectable()
export class SdSmtpClientServiceProvider {
  public constructor(private readonly _service: SdServiceProvider) {
  }

  public async sendAsync(options: ISmtpClientSendOption): Promise<void> {
    await this._service.sendCommandAsync("SdSmtpClientService.sendAsync", [options]);
  }

  public async sendDefaultAsync(options: ISmtpClientSendByDefaultOption): Promise<void> {
    await this._service.sendCommandAsync("SdSmtpClientService.sendByDefaultAsync", [options]);
  }
}
