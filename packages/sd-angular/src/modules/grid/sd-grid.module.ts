import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdGridControl } from "./sd-grid.control";
import { SdGridItemControl } from "./sd-grid-item.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdGridControl, SdGridItemControl],
  exports: [SdGridControl, SdGridItemControl],
  providers: []
})
export class SdGridModule {
}
