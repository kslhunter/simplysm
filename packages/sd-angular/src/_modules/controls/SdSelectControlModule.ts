import { SdSelectControl } from "../../controls/SdSelectControl";
import { SdSelectItemControl } from "../../controls/SdSelectItemControl";
import { SdAnchorControlModule } from "./SdAnchorControlModule";
import { SdCheckboxControlModule } from "./SdCheckboxControlModule";
import { SdDockContainerControlModule } from "./SdDockContainerControlModule";
import { SdDropdownControlModule } from "./SdDropdownControlModule";
import { SdDropdownPopupControlModule } from "./SdDropdownPopupControlModule";
import { SdGapControlModule } from "./SdGapControlModule";
import { SdPaneControlModule } from "./SdPaneControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdAnchorControlModule, SdCheckboxControlModule, SdDockContainerControlModule, SdDropdownControlModule, SdDropdownPopupControlModule, SdGapControlModule, SdPaneControlModule],
  declarations: [SdSelectControl, SdSelectItemControl],
  exports: [SdSelectControl, SdSelectItemControl],
  providers: []
})
export class SdSelectControlModule {
}