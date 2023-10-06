import { SdTabviewControl } from "../../controls/SdTabviewControl";
import { SdTabviewItemControl } from "../../controls/SdTabviewItemControl";
import { SdDockContainerControlModule } from "./SdDockContainerControlModule";
import { SdPaneControlModule } from "./SdPaneControlModule";
import { SdTabControlModule } from "./SdTabControlModule";
import { SdTabItemControlModule } from "./SdTabItemControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdDockContainerControlModule, SdPaneControlModule, SdTabControlModule, SdTabItemControlModule],
  declarations: [SdTabviewControl, SdTabviewItemControl],
  exports: [SdTabviewControl, SdTabviewItemControl],
  providers: []
})
export class SdTabviewControlModule {
}