import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdBusyContainerControl} from "./SdBusyContainerControl";
import {SdSharedModule} from "../shared/SdSharedModule";

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
}
