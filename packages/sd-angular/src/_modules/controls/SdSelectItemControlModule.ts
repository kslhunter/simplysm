import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSelectItemControl} from "../../controls/SdSelectItemControl";
import {SdSelectControlModule} from "./SdSelectControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdSelectControlModule
  ],
  declarations: [
    SdSelectItemControl
  ],
  exports: [
    SdSelectItemControl
  ],
  entryComponents: [],
  providers: []
})
export class SdSelectItemControlModule {
}