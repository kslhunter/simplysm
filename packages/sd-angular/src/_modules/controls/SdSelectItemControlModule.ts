import {NgModule} from "@angular/core";
import {SdSelectItemControl} from "../../controls/SdSelectItemControl";
import {SdSelectControlModule} from "./SdSelectControlModule";
import {CommonModule} from "@angular/common";

@NgModule({
  imports: [
    SdSelectControlModule,
    CommonModule
  ],
  declarations: [
    SdSelectItemControl
  ],
  exports: [
    SdSelectItemControl
  ],
  entryComponents: []
})
export class SdSelectItemControlModule {
}