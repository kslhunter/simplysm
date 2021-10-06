import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdCheckboxControl } from "./SdCheckboxControl";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdCheckboxGroupItemControl } from "./SdCheckboxGroupItemControl";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule
  ],
  declarations: [
    SdCheckboxControl,
    SdCheckboxGroupItemControl
  ],
  exports: [
    SdCheckboxControl,
    SdCheckboxGroupItemControl
  ]
})
export class SdCheckboxControlModule {
}
