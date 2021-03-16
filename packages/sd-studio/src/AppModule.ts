import "../scss/styles.scss";

import { ApplicationRef, DoBootstrap, NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { AppPage } from "./AppPage";
import { SdAngularModule, SdLocalStorageRootProvider, SdSystemLogRootProvider } from "@simplysm/sd-angular";
import { AppPageModule } from "./_modules/AppPageModule";
import { RouterModule } from "@angular/router";
import { routes } from "./_routes";

@NgModule({
  imports: [
    BrowserModule,

    RouterModule.forRoot([
      { path: "", redirectTo: "/main", pathMatch: "full" },
      ...routes
    ], { useHash: true }),

    SdAngularModule.forRoot(),

    AppPageModule
  ],
  entryComponents: [
    AppPage
  ]
})
export class AppModule implements DoBootstrap {
  public constructor(private readonly _localStorage: SdLocalStorageRootProvider,
                     private readonly _systemLog: SdSystemLogRootProvider) {
  }

  public ngDoBootstrap(appRef: ApplicationRef): void {
    this._localStorage.prefix = "simplysm.sd-studio";

    this._systemLog.writeFn = (severity: "error" | "warn" | "log", ...logs: any[]): void => {
      // eslint-disable-next-line no-console
      console[severity](...logs);
    };

    appRef.bootstrap(AppPage);
  }
}
