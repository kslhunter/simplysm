import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdDockModule } from "../dock";
import { SdPaneModule } from "../pane";
import { SdTabModule } from "../tab";
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
