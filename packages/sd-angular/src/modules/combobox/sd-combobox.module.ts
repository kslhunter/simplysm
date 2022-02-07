import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdComboboxComponent } from "./sd-combobox.component";
import { SdComboboxItemComponent } from "./sd-combobox-item.component";
import { SdTextfieldModule } from "../textfield";

@NgModule({
  imports: [CommonModule, FontAwesomeModule, SdTextfieldModule],
  declarations: [SdComboboxComponent, SdComboboxItemComponent],
  exports: [SdComboboxComponent, SdComboboxItemComponent],
  providers: []
})
export class SdComboboxModule {
}
