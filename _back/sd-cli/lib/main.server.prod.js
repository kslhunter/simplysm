const enableProdMode = require("@angular/core").enableProdMode;
enableProdMode();

const AppServerModuleNgFactory = require("SD_APP_MODULE_FACTORY").AppServerModuleNgFactory;

export {AppServerModuleNgFactory};
export {ngExpressEngine} from "@nguniversal/express-engine";
export {provideModuleMap} from "@nguniversal/module-map-ngfactory-loader";
