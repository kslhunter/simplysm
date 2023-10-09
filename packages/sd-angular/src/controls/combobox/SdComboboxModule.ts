import {SdComboboxControl} from "./SdComboboxControl";
import {SdComboboxItemControl} from "./SdComboboxItemControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {SdTextfieldControl} from "../SdTextfieldControl";

@NgModule({
  imports: [CommonModule, SdTextfieldControl, FontAwesomeModule],
  declarations: [SdComboboxControl, SdComboboxItemControl],
  exports: [SdComboboxControl, SdComboboxItemControl],
  providers: []
})
export class SdComboboxModule {
}