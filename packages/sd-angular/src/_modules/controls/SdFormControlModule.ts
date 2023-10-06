import { SdFormControl } from "../../controls/SdFormControl";
import { SdToastProviderModule } from "../providers/SdToastProviderModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdToastProviderModule],
  declarations: [SdFormControl],
  exports: [SdFormControl],
  providers: []
})
export class SdFormControlModule {
}