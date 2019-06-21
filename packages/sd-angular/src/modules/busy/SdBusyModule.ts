import {ModuleWithProviders, NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdBusyContainerControl} from "./SdBusyContainerControl";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdBusyContainerProvider} from "./SdBusyContainerProvider";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdBusyContainerControl
  ],
  declarations: [
    SdBusyContainerControl
  ]
})
export class SdBusyModule {
  public static forRoot(): ModuleWithProviders<SdBusyModule> {
    return {
      ngModule: SdBusyModule,
      providers: [
        SdBusyContainerProvider
      ]
    };
  }
}
