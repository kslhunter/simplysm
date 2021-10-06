import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdFormControl } from "./SdFormControl";
import { SdFormItemControl } from "./SdFormItemControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdFormControl,
    SdFormItemControl
  ],
  exports: [
    SdFormControl,
    SdFormItemControl
  ]
})
export class SdFormControlModule {
}
