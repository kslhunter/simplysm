import { ApplicationRef, DoBootstrap, NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { AppPage } from "./AppPage";
import {
  SdAngularModule,
  SdBusyContainerControlModule,
  SdLocalStorageRootProvider,
  SdSystemLogRootProvider
} from "@simplysm/sd-angular";
import { RouterModule } from "@angular/router";
import { ServiceWorkerModule } from "@angular/service-worker";

@NgModule({
  imports: [
    BrowserModule,
    ServiceWorkerModule.register("ngsw-worker.js", {
      enabled: Boolean(process.env.production),
      registrationStrategy: "registerWhenStable:30000"
    }),

    SdAngularModule.forRoot(),
    SdBusyContainerControlModule,

    RouterModule.forRoot([
      {
        path: "", redirectTo: "/main", pathMatch: "full"
      },
      {
        path: "main",
        loadChildren: async () => await import("./pages/MainPageModule").then((m) => m.MainPageModule)
      }
    ], { useHash: true })
  ],
  declarations: [
    AppPage
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
