import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdDropdownControl} from "./SdDropdownControl";
import {SdDropdownPopupControl} from "./SdDropdownPopupControl";
import {SdEventDirectiveModule} from "../../directives/SdEventDirectiveModule";

@NgModule({
  imports: [CommonModule, SdEventDirectiveModule],
  declarations: [SdDropdownControl, SdDropdownPopupControl],
  exports: [SdDropdownControl, SdDropdownPopupControl],
  providers: []
})
export class SdDropdownModule {
}