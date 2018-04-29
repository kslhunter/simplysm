import {SimgularModule} from "@simplism/angular";
import {enableProdMode, NgModule} from "@angular/core";
import {platformBrowserDynamic} from "@angular/platform-browser-dynamic";
import {controls, modals, printTemplates, providers, routeDeclarations, routes} from "./AppModuleDefinitions";
import "core-js/es7/reflect";
import "zone.js/dist/zone";

if (process.env.NODE_ENV === "production") {
    enableProdMode();
}
if (module["hot"]) module["hot"].accept();

// tslint:disable-next-line:variable-name
const AppPage = require("APP_PAGE_PATH").AppPage;

@NgModule({
    imports: [
        SimgularModule,
        RouterModule.forRoot(routes, {useHash: true})
    ],
    declarations: [AppPage]
        .concat(routeDeclarations)
        .concat(controls)
        .concat(modals)
        .concat(printTemplates),
    providers,
    bootstrap: [AppPage],
    entryComponents: modals.concat(printTemplates)
})
export class AppModule {
}

platformBrowserDynamic().bootstrapModule(AppModule);