import {NgModule} from "@angular/core";
import {SdCheckboxControl} from "../../controls/SdCheckboxControl";
import {CommonModule} from "@angular/common";
import {SdIconControlModule} from "./SdIconControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule
  ],
  declarations: [
    SdCheckboxControl
  ],
  exports: [
    SdCheckboxControl
  ],
  entryComponents: []
})
export class SdCheckboxControlModule {
}