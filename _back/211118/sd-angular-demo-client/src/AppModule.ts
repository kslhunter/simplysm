import { ApplicationRef, DoBootstrap, NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { AppPage } from "./AppPage";
import {
  SdAngularModule,
  SdBusyContainerControlModule,
  SdLocalStorageRootProvider,
  SdSystemLogRootProvider
} from "../../../../packages/sd-angular";
import { ServiceWorkerModule } from "@angular/service-worker";
import { RouterModule } from "@angular/router";
import { routes } from "./_routes";
import { AppPageModule } from "./_modules/AppPageModule";

@NgModule({
  imports: [
    BrowserModule,
    ServiceWorkerModule.register("ngsw-worker.js", {
      enabled: process.env.NODE_ENV === "production",
      registrationStrategy: "registerWhenStable:30000"
    }),
    RouterModule.forRoot([
      {
        path: "",
        redirectTo: "/main",
        pathMatch: "full"
      },
      ...routes
    ], { useHash: true }),

    SdAngularModule.forRoot(),
    SdBusyContainerControlModule,

    AppPageModule
  ]
})
export class AppModule implements DoBootstrap {
  public constructor(private readonly _localStorage: SdLocalStorageRootProvider,
                     private readonly _systemLog: SdSystemLogRootProvider) {
  }

  public ngDoBootstrap(appRef: ApplicationRef): void {
    this._localStorage.prefix = "simplysm.sd-angular-demo-client";

    this._systemLog.writeFn = (severity: "error" | "warn" | "log", ...logs: any[]): void => {
      // eslint-disable-next-line no-console
      console[severity](...logs);
    };

    appRef.bootstrap(AppPage);
  }
}
