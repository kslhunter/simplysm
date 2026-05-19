import { inject, Injectable } from "@angular/core";
import { SdServiceClientFactoryProvider } from "@simplysm/angular";
import { env, num, parseBoolEnv } from "@simplysm/core-common";

export const APP_MAIN_SERVICE_KEY = "MAIN";

@Injectable({ providedIn: "root" })
export class AppServiceProvider {
  private readonly _sdServiceClientFactory = inject(SdServiceClientFactoryProvider);

  get client() {
    return this._sdServiceClientFactory.get(APP_MAIN_SERVICE_KEY);
  }

  async connectAsync() {
    await this._sdServiceClientFactory.connectAsync(
      APP_MAIN_SERVICE_KEY,
      Boolean(env("SERVER_HOST"))
        ? {
            host: env("SERVER_HOST"),
            port: num.parseInt(env("SERVER_PORT")),
            ssl: parseBoolEnv(env("SERVER_SSL")),
          }
        : {},
    );
  }
}
