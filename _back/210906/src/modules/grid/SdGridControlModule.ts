import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdGridControl } from "./SdGridControl";
import { SdGridItemControl } from "./SdGridItemControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdGridControl,
    SdGridItemControl
  ],
  exports: [
    SdGridControl,
    SdGridItemControl
  ]
})
export class SdGridControlModule {
}
