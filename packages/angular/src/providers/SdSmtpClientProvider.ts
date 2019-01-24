import {Injectable} from "@angular/core";
import {SdWebSocketProvider} from "./SdWebSocketProvider";
import {ISmtpClientSendOption} from "@simplysm/smtp-client-common";

@Injectable()
export class SdSmtpClientProvider {
  public constructor(private readonly _ws: SdWebSocketProvider) {
  }

  public async sendAsync(options: ISmtpClientSendOption): Promise<void> {
    await this._ws.sendAsync("SmtpClientService.sendAsync", [options]);
  }
}
