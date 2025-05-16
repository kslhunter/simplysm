/// <reference types="@simplysm/sd-angular/src/assets"/>

import { enableProdMode, provideExperimentalZonelessChangeDetection } from "@angular/core";
import { EventEmitter } from "events";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideSdAngular } from "@simplysm/sd-angular";
import { SdServiceClient } from "@simplysm/sd-service-client";
import { AppPage } from "./app.page";

EventEmitter.defaultMaxListeners = 0;

if (process.env["NODE_ENV"] === "production") {
  enableProdMode();
}

(async () => {
  if (process.env["NODE_ENV"] !== "production") {
    const serviceClient = new SdServiceClient("cordova-test", {
      host: location.hostname,
      port: Number.parseInt(location.port),
      ssl: false,
      useReconnect: false,
    });
    await serviceClient.connectAsync();
  }

  await bootstrapApplication(AppPage, {
    providers: [
      provideSdAngular({
        clientName: "cordova-test",
        defaultTheme: "mobile",
      }),
      provideExperimentalZonelessChangeDetection(),
    ],
  });
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
});
