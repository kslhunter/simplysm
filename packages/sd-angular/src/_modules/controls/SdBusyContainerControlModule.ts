import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdBusyContainerControl} from "../../controls/SdBusyContainerControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdBusyContainerControl
  ],
  exports: [
    SdBusyContainerControl
  ],
  entryComponents: [],
  providers: []
})
export class SdBusyContainerControlModule {
}