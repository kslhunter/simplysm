import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdTabControl } from "./SdTabControl";
import { SdTabItemControl } from "./SdTabItemControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdTabControl,
    SdTabItemControl
  ],
  exports: [
    SdTabControl,
    SdTabItemControl
  ]
})
export class SdTabControlModule {
}
