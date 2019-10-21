require("core-js/proposals/reflect-metadata");
require("zone.js/dist/zone");

const enableProdMode = require("@angular/core").enableProdMode;
const platformBrowserDynamic = require("@angular/platform-browser-dynamic").platformBrowserDynamic;
const AppModuleNgFactory = require("SD_APP_MODULE_FACTORY").AppModuleNgFactory;

enableProdMode();

if (process.env.SD_PLATFORM) {
  // document.addEventListener("deviceready", () => {
  window.addEventListener = function () {
    EventTarget.prototype.addEventListener.apply(this, arguments);
  };
  window.removeEventListener = function () {
    EventTarget.prototype.removeEventListener.apply(this, arguments);
  };
  document.addEventListener = function () {
    EventTarget.prototype.addEventListener.apply(this, arguments);
  };
  document.removeEventListener = function () {
    EventTarget.prototype.removeEventListener.apply(this, arguments);
  };
  platformBrowserDynamic().bootstrapModuleFactory(AppModuleNgFactory).catch(err => {
    console.error(err);
  });
  // });
}
else {
  platformBrowserDynamic().bootstrapModuleFactory(AppModuleNgFactory).catch(err => {
    console.error(err);
  });
}
