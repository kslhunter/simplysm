import {NgModule, ApplicationModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdComboboxControl} from "../../controls/SdComboboxControl";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {SdTextfieldControlModule} from "./SdTextfieldControlModule";
import {SdComboboxItemControl} from "../../controls/SdComboboxItemControl";

@NgModule({
  imports: [
    CommonModule,
    ApplicationModule,
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
  entryComponents: [],
  providers: []
})
export class SdComboboxControlModule {
}