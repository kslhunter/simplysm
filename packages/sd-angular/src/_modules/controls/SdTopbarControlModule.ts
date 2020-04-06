import {NgModule} from "@angular/core";
import {SdTopbarControl} from "../../controls/SdTopbarControl";
import {SdSidebarContainerControlModule} from "./SdSidebarContainerControlModule";
import {SdTopbarContainerControlModule} from "./SdTopbarContainerControlModule";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {CommonModule} from "@angular/common";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {SdGapControlModule} from "./SdGapControlModule";

@NgModule({
  imports: [
    SdSidebarContainerControlModule,
    SdTopbarContainerControlModule,
    SdIconControlModule,
    CommonModule,
    SdAnchorControlModule,
    SdGapControlModule
  ],
  declarations: [
    SdTopbarControl
  ],
  exports: [
    SdTopbarControl
  ],
  entryComponents: [],
  providers: []
})
export class SdTopbarControlModule {
}