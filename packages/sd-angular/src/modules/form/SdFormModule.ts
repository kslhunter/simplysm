import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdFormControl} from "./SdFormControl";
import {SdFormItemControl} from "./SdFormItemControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdFormControl,
    SdFormItemControl
  ],
  declarations: [
    SdFormControl,
    SdFormItemControl
  ]
})
export class SdFormModule {
}
