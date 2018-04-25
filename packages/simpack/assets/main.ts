import {enableProdMode} from "@angular/core";
import {platformBrowserDynamic} from "@angular/platform-browser-dynamic";
import "zone.js/dist/zone";

if (process.env.NODE_ENV === "production") {
    enableProdMode();
}

if (module["hot"]) {
    module["hot"].accept();
}

(async () => await platformBrowserDynamic().bootstrapModule(require("APP_MODULE_PATH").AppModule))();