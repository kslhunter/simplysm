import {ModuleWithProviders, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdEasyPayProvider} from "./SdEasyPayProvider";
import {SdServiceModule} from "../service/SdServiceModule";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdServiceModule
  ],
  exports: [],
  declarations: []
})
export class SdEasyPayModule {
  public static forRoot(): ModuleWithProviders<SdEasyPayModule> {
    return {
      ngModule: SdEasyPayModule,
      providers: [
        SdEasyPayProvider
      ]
    };
  }
}
