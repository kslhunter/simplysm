import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdDropdownControl } from "./sd-dropdown.control";
import { SdDropdownPopupControl } from "./sd-dropdown-popup.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdDropdownControl, SdDropdownPopupControl],
  exports: [SdDropdownControl, SdDropdownPopupControl],
  providers: []
})
export class SdDropdownModule {
}
