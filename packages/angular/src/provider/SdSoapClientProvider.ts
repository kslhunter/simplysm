import {Injectable} from "@angular/core";
import * as soap from "soap";

export interface ISoapClientSendOption {
  url: string;
  method: string;
  args: { [key: string]: any };
}

@Injectable()
export class SdSoapClientProvider {
  public async sendAsync(options: ISoapClientSendOption): Promise<any> {
    const client = await soap.createClientAsync(options.url);
    return await client[options.method + "Async"](options.args);
  }
}
