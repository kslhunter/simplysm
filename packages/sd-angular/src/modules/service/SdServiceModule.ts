import {ModuleWithProviders, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdCryptoServiceProvider} from "./SdCryptoServiceProvider";
import {SdOrmServiceProvider} from "./SdOrmServiceProvider";
import {SdSmtpClientServiceProvider} from "./SdSmtpClientServiceProvider";
import {SdServiceProvider} from "./SdServiceProvider";
import {SdSharedModule} from "../shared/SdSharedModule";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  providers: [
    SdCryptoServiceProvider,
    SdOrmServiceProvider,
    SdSmtpClientServiceProvider
  ]
})
export class SdServiceModule {
  public static forRoot(): ModuleWithProviders<SdServiceModule> {
    return {
      ngModule: SdServiceModule,
      providers: [
        SdServiceProvider
      ]
    };
  }
}
