import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdComboboxControl } from "./sd-combobox.control";
import { SdComboboxItemControl } from "./sd-combobox-item.control";
import { SdTextfieldModule } from "../textfield/sd-textfield.module";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdTextfieldModule],
  declarations: [SdComboboxControl, SdComboboxItemControl],
  exports: [SdComboboxControl, SdComboboxItemControl],
  providers: []
})
export class SdComboboxModule {
}
