import {enableProdMode} from "@angular/core";
import {platformBrowserDynamic} from "@angular/platform-browser-dynamic";
import "zone.js/dist/zone";
import {AppModule} from "./AppModule";

if (process.env.NODE_ENV === "production") {
    enableProdMode();
}

(async () => await platformBrowserDynamic().bootstrapModule(AppModule))();