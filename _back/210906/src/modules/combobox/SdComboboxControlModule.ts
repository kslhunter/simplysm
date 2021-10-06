import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdComboboxControl } from "./SdComboboxControl";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdTextfieldControlModule } from "../textfield/SdTextfieldControlModule";
import { SdComboboxItemControl } from "./SdComboboxItemControl";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
    SdTextfieldControlModule
  ],
  declarations: [
    SdComboboxControl,
    SdComboboxItemControl
  ],
  exports: [
    SdComboboxControl,
    SdComboboxItemControl
  ]
})
export class SdComboboxControlModule {
}
