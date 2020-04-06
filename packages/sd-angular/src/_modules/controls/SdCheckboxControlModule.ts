import {NgModule} from "@angular/core";
import {SdCheckboxControl} from "../../controls/SdCheckboxControl";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {CommonModule} from "@angular/common";

@NgModule({
  imports: [
    SdIconControlModule,
    CommonModule
  ],
  declarations: [
    SdCheckboxControl
  ],
  exports: [
    SdCheckboxControl
  ],
  entryComponents: [],
  providers: []
})
export class SdCheckboxControlModule {
}