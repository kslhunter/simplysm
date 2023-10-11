import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdDropdownControl} from "./SdDropdownControl";
import {SdDropdownPopupControl} from "./SdDropdownPopupControl";
import {SdResizeDirective} from "../../directives/SdResizeDirective";

@NgModule({
    imports: [CommonModule, SdResizeDirective],
  declarations: [SdDropdownControl, SdDropdownPopupControl],
  exports: [SdDropdownControl, SdDropdownPopupControl],
  providers: []
})
export class SdDropdownModule {
}