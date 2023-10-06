import { SdCheckboxGroupItemControl } from "../../controls/SdCheckboxGroupItemControl";
import { SdCheckboxControlModule } from "./SdCheckboxControlModule";
import { SdCheckboxGroupControlModule } from "./SdCheckboxGroupControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdCheckboxControlModule, SdCheckboxGroupControlModule],
  declarations: [SdCheckboxGroupItemControl],
  exports: [SdCheckboxGroupItemControl],
  providers: []
})
export class SdCheckboxGroupItemControlModule {
}