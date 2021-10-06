import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdViewControl } from "./SdViewControl";
import { SdViewItemControl } from "./SdViewItemControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdViewControl,
    SdViewItemControl
  ],
  exports: [
    SdViewControl,
    SdViewItemControl
  ]
})
export class SdViewControlModule {
}
