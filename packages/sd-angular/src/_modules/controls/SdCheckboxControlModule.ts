import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdCheckboxControl} from "../../controls/SdCheckboxControl";
import {SdIconControlModule} from "./icons/SdIconControlModule";

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
  entryComponents: [],
  providers: []
})
export class SdCheckboxControlModule {
}