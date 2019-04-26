import { Injectable } from "@angular/core";

const soap = require("soap/lib/client"); //tslint:disable-line:no-var-requires no-require-imports
const wsdl = require("soap/lib/wsdl"); //tslint:disable-line:no-var-requires no-require-imports

export interface ISoapClientSendOption {
  url: string;
  method: string;
  args: { [key: string]: any };
}

@Injectable()
export class SdSoapProvider {
  private readonly _cache: { [url: string]: any } = {};

  public async sendAsync(options: ISoapClientSendOption): Promise<any> {
    const client = await this._createClientAsync(options.url);
    return await client[options.method + "Async"](options.args);
  }

  private async _createClientAsync(url: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      if (!this._cache[url]) {
        wsdl.open_wsdl(url, (err: Error, wsdlClient: any) => {
          if (err) {
            reject(err);
            return;
          }
          this._cache[url] = wsdlClient;
          resolve(wsdlClient && new soap.Client(wsdlClient));
        });
      } else {
        process.nextTick(() => {
          resolve(this._cache[url] && new soap.Client(this._cache[url]));
        });
      }
    });
  }
}
