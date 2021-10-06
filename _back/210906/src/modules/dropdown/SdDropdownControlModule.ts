import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdDropdownControl } from "./SdDropdownControl";
import { SdDropdownPopupControl } from "./SdDropdownPopupControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdDropdownControl,
    SdDropdownPopupControl
  ],
  exports: [
    SdDropdownControl,
    SdDropdownPopupControl
  ]
})
export class SdDropdownControlModule {
}
