require("core-js/es7/reflect");
require("zone.js/dist/zone");

const AppModule = require("SIMPLYSM_CLIENT_APP_MODULE").AppModule;
const platformBrowserDynamic = require("@angular/platform-browser-dynamic").platformBrowserDynamic;

if (process.env.NODE_ENV !== "production") {
  require("zone.js/dist/long-stack-trace-zone");
  Error.stackTraceLimit = Infinity;
}

if (process.env.NODE_ENV === "production") {
  const enableProdMode = require("@angular/core").enableProdMode;
  enableProdMode();
}

if (module.hot) {
  console.clear();
  module.hot.accept();
}

platformBrowserDynamic().bootstrapModule(AppModule);
