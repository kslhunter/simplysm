import { SdComboboxControl } from "../../controls/SdComboboxControl";
import { SdComboboxItemControl } from "../../controls/SdComboboxItemControl";
import { SdTextfieldControlModule } from "./SdTextfieldControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdTextfieldControlModule],
  declarations: [SdComboboxControl, SdComboboxItemControl],
  exports: [SdComboboxControl, SdComboboxItemControl],
  providers: []
})
export class SdComboboxControlModule {
}