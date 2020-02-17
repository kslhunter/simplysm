import {NgModule, ApplicationModule} from "@angular/core";
import {SdComboboxControl} from "../../controls/SdComboboxControl";
import {CommonModule} from "@angular/common";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdTextfieldControlModule} from "./SdTextfieldControlModule";
import {SdComboboxItemControl} from "../../controls/SdComboboxItemControl";

@NgModule({
  imports: [
    ApplicationModule,
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
  ],
  entryComponents: []
})
export class SdComboboxControlModule {
}