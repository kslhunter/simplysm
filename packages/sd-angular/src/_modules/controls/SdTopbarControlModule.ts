import {NgModule} from "@angular/core";
import {SdTopbarControl} from "../../controls/SdTopbarControl";
import {SdSidebarContainerControlModule} from "./SdSidebarContainerControlModule";
import {CommonModule} from "@angular/common";
import {SdIconControlModule} from "./SdIconControlModule";

@NgModule({
  imports: [
    SdSidebarContainerControlModule,
    CommonModule,
    SdIconControlModule
  ],
  declarations: [
    SdTopbarControl
  ],
  exports: [
    SdTopbarControl
  ],
  entryComponents: []
})
export class SdTopbarControlModule {
}