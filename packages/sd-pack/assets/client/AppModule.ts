import {NgModule} from "@angular/core";
import {RouterModule} from "@angular/router";
import {SdAngularModule, SdLocalStorageProvider, SdServiceProvider} from "@simplism/sd-angular";
import {controls, modals, printTemplates, providers, routeDeclarations, routes} from "./definitions";
import {Logger} from "@simplism/sd-core";

const AppPage = require("APP_PAGE_PATH").AppPage;

@NgModule({
    imports: [
        SdAngularModule,
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
    public constructor(private _localStorage: SdLocalStorageProvider,
                       private _service: SdServiceProvider) {
        this._localStorage.prefix = process.env.SD_PACK_TITLE;
        this._service.connect(`ws://${process.env.SD_PACK_SERVER_HOST}:${process.env.SD_PACK_SERVER_PORT}`);

        if (process.env.NODE_ENV === "production") {
            Logger.setGroupConfig(undefined, {
                consoleLogTypes: ["info", "warn", "error"]
            });
        }
    }
}