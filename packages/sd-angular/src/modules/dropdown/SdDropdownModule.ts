import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdDropdownControl} from "./SdDropdownControl";
import {SdDropdownPopupControl} from "./SdDropdownPopupControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdDropdownControl,
    SdDropdownPopupControl
  ],
  declarations: [
    SdDropdownControl,
    SdDropdownPopupControl
  ]
})
export class SdDropdownModule {
}
