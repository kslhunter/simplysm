require("core-js/es7/reflect");
require("zone.js/dist/zone");

const AppModule = require("SIMPLISM_CLIENT_APP_MODULE").AppModule;
const hmrBootstrap = require("@simplism/angular-hmr").hmrBootstrap;

if (process.env.NODE_ENV !== "production") {
  require("zone.js/dist/long-stack-trace-zone"); //tslint:disable-line: no-var-requires no-require-imports
  Error.stackTraceLimit = Infinity;
}

if (process.env.NODE_ENV === "production") {
  const enableProdMode = require("@angular/core").enableProdMode;
  enableProdMode();
}

if (process.env.PLATFORM === "android") {
  document.addEventListener("deviceready", () => {
    hmrBootstrap(module, AppModule);
  }, false);
}
else {
  hmrBootstrap(module, AppModule);
}