import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdFormItemControl} from "../../controls/SdFormItemControl";
import {SdFormControlModule} from "./SdFormControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdFormControlModule
  ],
  declarations: [
    SdFormItemControl
  ],
  exports: [
    SdFormItemControl
  ],
  entryComponents: [],
  providers: []
})
export class SdFormItemControlModule {
}