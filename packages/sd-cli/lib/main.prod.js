require("core-js/es7/reflect");
require("zone.js/dist/zone");
const ngCore = require("@angular/core");
const platformBrowserDynamic = require("@angular/platform-browser-dynamic").platformBrowserDynamic;
const {AppModuleNgFactory} = require("SIMPLYSM_CLIENT_APP_MODULE_NGFACTORY");

ngCore.enableProdMode();

platformBrowserDynamic().bootstrapModuleFactory(AppModuleNgFactory)
  .catch(err => console.error(err));
