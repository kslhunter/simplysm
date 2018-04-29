import {platformBrowserDynamic} from "@angular/platform-browser-dynamic";
import {enableProdMode} from "@angular/core";
import "core-js/es6";
import "core-js/es7/reflect";
import "core-js/es7/array";
import "core-js/es7/string";

require("zone.js/dist/zone");

if (process.env.NODE_ENV === "production") {
} else {
    Error["stackTraceLimit"] = Infinity;
    require("zone.js/dist/long-stack-trace-zone");
}

if (process.env.NODE_ENV === "production") {
    enableProdMode();
}

if (process.env.PLATFORM === "web") {
    const AppModule = require("APP_MODULE_PATH").AppModule;
    platformBrowserDynamic().bootstrapModule(AppModule);
}
else {
    document.addEventListener("deviceready", () => {
        const AppModule = require("APP_MODULE_PATH").AppModule;
        platformBrowserDynamic().bootstrapModule(AppModule);
    });
}
