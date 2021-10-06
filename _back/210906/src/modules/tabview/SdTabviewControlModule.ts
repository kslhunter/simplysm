import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdTabviewControl } from "./SdTabviewControl";
import { SdDockContainerControlModule } from "../dock/SdDockContainerControlModule";
import { SdPaneControlModule } from "../pane/SdPaneControlModule";
import { SdTabControlModule } from "../tab/SdTabControlModule";
import { SdTabviewItemControl } from "./SdTabviewItemControl";

@NgModule({
  imports: [
    CommonModule,
    SdDockContainerControlModule,
    SdPaneControlModule,
    SdTabControlModule
  ],
  declarations: [
    SdTabviewControl,
    SdTabviewItemControl
  ],
  exports: [
    SdTabviewControl,
    SdTabviewItemControl
  ]
})
export class SdTabviewControlModule {
}
