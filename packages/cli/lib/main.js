require("core-js/es7/reflect");
require("zone.js/dist/zone");

const AppModule = require("SIMPLYSM_CLIENT_APP_MODULE").AppModule;
const platformBrowserDynamic = require("@angular/platform-browser-dynamic").platformBrowserDynamic;
// const hmr = require("@angularclass/hmr");

if (process.env.NODE_ENV !== "production") {
  require("zone.js/dist/long-stack-trace-zone");
  Error.stackTraceLimit = Infinity;
}

if (process.env.NODE_ENV === "production") {
  const enableProdMode = require("@angular/core").enableProdMode;
  enableProdMode();
}


// if (process.env.NODE_ENV === "production") {
platformBrowserDynamic().bootstrapModule(AppModule);
// }
// else {
//   hmr.bootloader(() => {
//     return platformBrowserDynamic().bootstrapModule(AppModule)
//       .then(ngModuleRef => hmr.hmrModule(ngModuleRef, module));
//   });
// }
