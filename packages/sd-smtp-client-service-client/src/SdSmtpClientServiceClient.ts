import {ISmtpClientSendOption} from "./ISmtpClientSendOption";
import {SdWebSocketClient} from "@simplysm/sd-service-client";

export class SdSmtpClientServiceClient {
  public constructor(private readonly _ws: SdWebSocketClient) {
  }

  public async sendAsync(options: ISmtpClientSendOption): Promise<void> {
    await this._ws.sendAsync("SdSmtpClientService.sendAsync", [options]);
  }
}
