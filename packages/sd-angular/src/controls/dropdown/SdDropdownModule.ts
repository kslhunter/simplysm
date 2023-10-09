import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdDropdownControl} from "./SdDropdownControl";
import {SdDropdownPopupControl} from "./SdDropdownPopupControl";

@NgModule({
  imports: [CommonModule],
  declarations: [SdDropdownControl, SdDropdownPopupControl],
  exports: [SdDropdownControl, SdDropdownPopupControl],
  providers: []
})
export class SdDropdownModule {
}