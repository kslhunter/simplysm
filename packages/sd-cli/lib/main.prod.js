/*
require("core-js/proposals/reflect-metadata");
require("zone.js/dist/zone");

const enableProdMode = require("@angular/core").enableProdMode;
const platformBrowserDynamic = require("@angular/platform-browser-dynamic").platformBrowserDynamic;
const AppModuleNgFactory = require("SD_APP_MODULE_FACTORY").AppModuleNgFactory;

enableProdMode();

platformBrowserDynamic().bootstrapModuleFactory(AppModuleNgFactory).catch(err => {
  console.error(err);
});
*/



const enableProdMode = require("@angular/core").enableProdMode;
enableProdMode();

const AppServerModuleNgFactory = require("SD_APP_MODULE_FACTORY").AppServerModuleNgFactory;

export { AppServerModuleNgFactory };
export { ngExpressEngine } from "@nguniversal/express-engine";
export { provideModuleMap } from "@nguniversal/module-map-ngfactory-loader";
