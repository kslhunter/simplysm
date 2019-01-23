import {Injectable} from "@angular/core";
import {SdWebSocketProvider} from "./SdWebSocketProvider";
import {ISmtpClientSendOption} from "@simplysm/smtp-client-common";

@Injectable()
export class SdSmtpClientProvider {
  public constructor(private readonly _socket: SdWebSocketProvider) {
  }

  public async sendAsync(options: ISmtpClientSendOption): Promise<void> {
    await this._socket.sendAsync("SmtpClientService.sendAsync", [options]);
  }
}
