import {NgModule} from "@angular/core";
import {SdCheckboxGroupItemControl} from "../../controls/SdCheckboxGroupItemControl";
import {SdCheckboxGroupControlModule} from "./SdCheckboxGroupControlModule";
import {SdCheckboxControlModule} from "./SdCheckboxControlModule";

@NgModule({
  imports: [
    SdCheckboxGroupControlModule,
    SdCheckboxControlModule
  ],
  declarations: [
    SdCheckboxGroupItemControl
  ],
  exports: [
    SdCheckboxGroupItemControl
  ],
  entryComponents: []
})
export class SdCheckboxGroupItemControlModule {
}