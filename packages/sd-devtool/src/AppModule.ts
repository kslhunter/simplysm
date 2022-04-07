import { ApplicationRef, DoBootstrap, NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { SdAngularModule, SdServiceFactoryRootProvider } from "@simplysm/sd-angular";
import { AppPageModule } from "./_modules/AppPageModule";
import { AppPage } from "./AppPage";
import { JsonConvert, NumberUtil } from "@simplysm/sd-core-common";

@NgModule({
  imports: [
    BrowserModule,
    SdAngularModule.forRoot(),
    AppPageModule
  ]
})
export class AppModule implements DoBootstrap {
  public constructor(private readonly _serviceFactory: SdServiceFactoryRootProvider) {
  }

  public async ngDoBootstrap(appRef: ApplicationRef): Promise<void> {
    await this._serviceFactory.connectAsync(
      "sd-devtool",
      "MAIN",
      process.env["NODE_ENV"] === "production" ? {
        host: process.env["SERVER_HOST"],
        port: NumberUtil.parseInt(process.env["SERVER_PORT"]),
        ssl: JsonConvert.parse(process.env["SERVER_SSL"] ?? "false")
      } : undefined
    );

    appRef.bootstrap(AppPage);
  }
}
