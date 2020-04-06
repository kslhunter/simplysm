import {NgModule, ApplicationModule} from "@angular/core";
import {SdComboboxControl} from "../../controls/SdComboboxControl";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {CommonModule} from "@angular/common";
import {SdTextfieldControlModule} from "./SdTextfieldControlModule";
import {SdComboboxItemControl} from "../../controls/SdComboboxItemControl";

@NgModule({
  imports: [
    ApplicationModule,
    SdIconControlModule,
    CommonModule,
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