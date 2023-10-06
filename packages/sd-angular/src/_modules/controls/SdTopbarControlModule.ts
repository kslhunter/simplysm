import { SdTopbarControl } from "../../controls/SdTopbarControl";
import { SdAnchorControlModule } from "./SdAnchorControlModule";
import { SdGapControlModule } from "./SdGapControlModule";
import { SdSidebarContainerControlModule } from "./SdSidebarContainerControlModule";
import { SdTopbarContainerControlModule } from "./SdTopbarContainerControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdAnchorControlModule, SdGapControlModule, SdSidebarContainerControlModule, SdTopbarContainerControlModule],
  declarations: [SdTopbarControl],
  exports: [SdTopbarControl],
  providers: []
})
export class SdTopbarControlModule {
}