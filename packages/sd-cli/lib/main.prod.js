"use strict";

require("@simplysm/sd-core-common");
require("element-qsa-scope");
require("core-js/proposals/reflect-metadata");
require("zone.js/dist/zone");

require("events").EventEmitter.defaultMaxListeners = 0;

const enableProdMode = require("@angular/core").enableProdMode;
const platformBrowserDynamic = require("@angular/platform-browser-dynamic").platformBrowserDynamic;
const AppModuleNgFactory = require("SD_APP_MODULE_FACTORY").AppModuleNgFactory;

enableProdMode();

platformBrowserDynamic().bootstrapModuleFactory(AppModuleNgFactory).catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
});
