import { ApplicationRef, DoBootstrap, NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { RouterModule } from "@angular/router";
import {
  SdAngularModule,
  SdCanDeactivateGuardModule,
  SdToastProvider,
  SdToastProviderModule
} from "@simplysm/sd-angular";
import { AppPage } from "./AppPage";
import { AppServiceRootProvider } from "./root-providers/AppServiceRootProvider";
import { AppPageModule } from "./_modules/AppPageModule";
import { routes } from "./_routes";

@NgModule({
  imports: [
    BrowserModule,
    RouterModule.forRoot([
      // 경로 미지정시, 첫 화면으로 표시될 경로
      { path: "", redirectTo: "/home/main", pathMatch: "full" },
      ...routes
    ], { useHash: true }),

    SdAngularModule.forRoot(),
    SdToastProviderModule,
    SdCanDeactivateGuardModule,

    AppPageModule
  ]
})
export class AppModule implements DoBootstrap {
  public constructor(private readonly _toast: SdToastProvider,
                     private readonly _service: AppServiceRootProvider) {
  }

  public async ngDoBootstrap(appRef: ApplicationRef): Promise<void> {
    await this._service.connectAsync("client-admin");

    this._toast.alertThemes = ["danger"];

    appRef.bootstrap(AppPage);
  }
}
