import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdTabControl } from "./sd-tab.control";
import { SdTabItemControl } from "./sd-tab-item.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdTabControl, SdTabItemControl],
  exports: [SdTabControl, SdTabItemControl],
  providers: []
})
export class SdTabModule {
}
