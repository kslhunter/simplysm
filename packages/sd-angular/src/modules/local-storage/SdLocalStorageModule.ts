import {ModuleWithProviders, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdLocalStorageProvider} from "./SdLocalStorageProvider";
import {SdSharedModule} from "../shared/SdSharedModule";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ]
})
export class SdLocalStorageModule {
  public static forRoot(): ModuleWithProviders<SdLocalStorageModule> {
    return {
      ngModule: SdLocalStorageModule,
      providers: [
        SdLocalStorageProvider
      ]
    };
  }
}
