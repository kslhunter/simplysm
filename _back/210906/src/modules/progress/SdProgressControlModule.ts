import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdProgressControl } from "./SdProgressControl";
import { SdProgressItemControl } from "./SdProgressItemControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdProgressControl,
    SdProgressItemControl
  ],
  exports: [
    SdProgressControl,
    SdProgressItemControl
  ]
})
export class SdProgressControlModule {
}
