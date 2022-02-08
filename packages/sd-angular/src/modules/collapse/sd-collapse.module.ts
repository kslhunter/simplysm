import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdCollapseControl } from "./sd-collapse.control";
import { SdResizeModule } from "../resize/sd-resize.module";

@NgModule({
  imports: [CommonModule, SdResizeModule],
  declarations: [SdCollapseControl],
  exports: [SdCollapseControl],
  providers: []
})
export class SdCollapseModule {
}
