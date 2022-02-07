import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdViewItemControl } from "./sd-view-item.control";
import { SdViewControl } from "./sd-view.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdViewControl, SdViewItemControl],
  exports: [SdViewControl, SdViewItemControl],
  providers: []
})
export class SdViewModule {
}
