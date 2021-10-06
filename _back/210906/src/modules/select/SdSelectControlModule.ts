import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdSelectControl } from "./SdSelectControl";
import { SdDropdownControlModule } from "../dropdown/SdDropdownControlModule";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdAnchorControlModule } from "../anchor/SdAnchorControlModule";
import { SdDockContainerControlModule } from "../dock/SdDockContainerControlModule";
import { SdGapControlModule } from "../gap/SdGapControlModule";
import { SdPaneControlModule } from "../pane/SdPaneControlModule";
import { SdSelectItemControl } from "./SdSelectItemControl";
import { SdCheckboxControlModule } from "../checkbox/SdCheckboxControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdDropdownControlModule,
    SdIconControlModule,
    SdAnchorControlModule,
    SdDockContainerControlModule,
    SdGapControlModule,
    SdPaneControlModule,
    SdCheckboxControlModule
  ],
  declarations: [
    SdSelectControl,
    SdSelectItemControl
  ],
  exports: [
    SdSelectControl,
    SdSelectItemControl
  ]
})
export class SdSelectControlModule {
}
