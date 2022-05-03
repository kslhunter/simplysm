import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdFormControl } from "./sd-form.control";
import { SdFormItemControl } from "./sd-form-item.control";
import { SdToastModule } from "../toast/sd-toast.module";

@NgModule({
  imports: [CommonModule, SdToastModule],
  declarations: [SdFormControl, SdFormItemControl],
  exports: [SdFormControl, SdFormItemControl],
  providers: []
})
export class SdFormModule {
}
