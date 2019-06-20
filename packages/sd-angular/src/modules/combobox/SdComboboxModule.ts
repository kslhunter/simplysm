import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {NgModule} from "@angular/core";
import {SdComboboxControl} from "./SdComboboxControl";
import {SdComboboxItemControl} from "./SdComboboxItemControl";
import {SdTextfieldModule} from "../textfield/SdTextfieldModule";
import {SdIconModule} from "../icon/SdIconModule";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdTextfieldModule,
    SdIconModule
  ],
  exports: [
    SdComboboxControl,
    SdComboboxItemControl
  ],
  declarations: [
    SdComboboxControl,
    SdComboboxItemControl
  ]
})
export class SdComboboxModule {
}
