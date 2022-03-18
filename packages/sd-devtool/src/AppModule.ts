import { ApplicationRef, DoBootstrap, NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { SdAngularModule } from "@simplysm/sd-angular";
import { AppPageModule } from "./_modules/AppPageModule";
import { AppPage } from "./AppPage";

@NgModule({
  imports: [
    BrowserModule,
    SdAngularModule.forRoot(),
    AppPageModule
  ]
})
export class AppModule implements DoBootstrap {
  public ngDoBootstrap(appRef: ApplicationRef): void {
    appRef.bootstrap(AppPage);
  }
}
