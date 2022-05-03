export const fc_package_client_main = (): string => /* language=ts */ `

import { enableProdMode } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { AppModule } from "./AppModule";

if (process.env["NODE_ENV"] === "production") {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error(err);
  });


`.trim();
