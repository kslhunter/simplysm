import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdTopbarControl} from "../../controls/SdTopbarControl";
import {SdSidebarContainerControlModule} from "./SdSidebarContainerControlModule";
import {SdTopbarContainerControlModule} from "./SdTopbarContainerControlModule";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {SdAnchorControlModule} from "./SdAnchorControlModule";
import {SdGapControlModule} from "./SdGapControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdSidebarContainerControlModule,
    SdTopbarContainerControlModule,
    SdIconControlModule,
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