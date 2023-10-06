import { SdFormItemControl } from "../../controls/SdFormItemControl";
import { SdFormControlModule } from "./SdFormControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdFormControlModule],
  declarations: [SdFormItemControl],
  exports: [SdFormItemControl],
  providers: []
})
export class SdFormItemControlModule {
}