import {SdComboboxControl} from "./SdComboboxControl";
import {SdComboboxItemControl} from "./SdComboboxItemControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdTextfieldControl} from "../SdTextfieldControl";
import {SdIconControl} from "../SdIconControl";

@NgModule({
  imports: [CommonModule, SdTextfieldControl, SdIconControl],
  declarations: [SdComboboxControl, SdComboboxItemControl],
  exports: [SdComboboxControl, SdComboboxItemControl],
  providers: []
})
export class SdComboboxModule {
}