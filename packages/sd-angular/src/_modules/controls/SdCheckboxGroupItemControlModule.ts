import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdCheckboxGroupItemControl} from "../../controls/SdCheckboxGroupItemControl";
import {SdCheckboxGroupControlModule} from "./SdCheckboxGroupControlModule";
import {SdCheckboxControlModule} from "./SdCheckboxControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdCheckboxGroupControlModule,
    SdCheckboxControlModule
  ],
  declarations: [
    SdCheckboxGroupItemControl
  ],
  exports: [
    SdCheckboxGroupItemControl
  ],
  entryComponents: [],
  providers: []
})
export class SdCheckboxGroupItemControlModule {
}