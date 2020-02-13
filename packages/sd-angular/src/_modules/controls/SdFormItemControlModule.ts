import {NgModule} from "@angular/core";
import {SdFormItemControl} from "../../controls/SdFormItemControl";
import {SdFormControlModule} from "./SdFormControlModule";
import {CommonModule} from "@angular/common";

@NgModule({
  imports: [
    SdFormControlModule,
    CommonModule
  ],
  declarations: [
    SdFormItemControl
  ],
  exports: [
    SdFormItemControl
  ],
  entryComponents: []
})
export class SdFormItemControlModule {
}