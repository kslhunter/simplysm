import {Injectable} from "@angular/core";
import {SdSocketProvider} from "./SdSocketProvider";
import {ISmtpClientSendOption} from "@simplism/smtp-client-common";

@Injectable()
export class SdSmtpClientProvider {
  public constructor(private readonly _socket: SdSocketProvider) {
  }

  public async sendAsync(options: ISmtpClientSendOption): Promise<void> {
    await this._socket.sendAsync("SmtpClientService.sendAsync", [options]);
  }
}