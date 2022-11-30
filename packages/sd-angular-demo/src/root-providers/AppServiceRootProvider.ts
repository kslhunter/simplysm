import { SdServiceFactoryRootProvider } from "@simplysm/sd-angular";
import { Injectable } from "@angular/core";
import { APP_CLIENT_NAME, APP_SERVICE_KEY } from "../commons";

@Injectable({ providedIn: "root" })
export class AppServiceRootProvider {
  public constructor(private readonly _serviceFactory: SdServiceFactoryRootProvider) {
  }

  public async connectAsync(clientName: string): Promise<void> {
    await this._serviceFactory.connectAsync(APP_CLIENT_NAME, APP_SERVICE_KEY);
  }
}
