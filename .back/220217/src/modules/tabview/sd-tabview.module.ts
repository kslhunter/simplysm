import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdDockModule } from "../dock/sd-dock.module";
import { SdPaneModule } from "../pane/sd-pane.module";
import { SdTabModule } from "../tab/sd-tab.module";
import { SdTabviewControl } from "./sd-tabview.control";
import { SdTabviewItemControl } from "./sd-tabview-item.control";

@NgModule({
  imports: [CommonModule, SdDockModule, SdPaneModule, SdTabModule],
  declarations: [SdTabviewControl, SdTabviewItemControl],
  exports: [SdTabviewControl, SdTabviewItemControl],
  providers: []
})
export class SdTabviewModule {
}
