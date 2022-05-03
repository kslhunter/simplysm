export const fc_package_AppModule = (): string => /* language=ts */ `

import { ApplicationRef, DoBootstrap, NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import {
  SdAngularModule,
  SdCanDeactivateGuardModule,
  SdToastProvider,
  SdToastProviderModule
} from "@simplysm/sd-angular";
import { AppPageModule } from "./_modules/AppPageModule";
import { AppPage } from "./AppPage";

@NgModule({
  imports: [
    BrowserModule,

    SdAngularModule.forRoot(),
    SdToastProviderModule,
    SdCanDeactivateGuardModule,

    AppPageModule
  ]
})
export class AppModule implements DoBootstrap {
  public constructor(private readonly _toast: SdToastProvider) {
  }

  public async ngDoBootstrap(appRef: ApplicationRef): Promise<void> {
    this._toast.alertThemes = ["danger"];

    appRef.bootstrap(AppPage);
  }
}

`.trim();
