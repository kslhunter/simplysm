import {NgModule, ApplicationModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdMultiSelectControl} from "../../controls/SdMultiSelectControl";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdDropdownControlModule} from "./SdDropdownControlModule";
import {SdDropdownPopupControlModule} from "./SdDropdownPopupControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdMultiSelectItemControl} from "../../controls/SdMultiSelectItemControl";
import {SdCheckboxControlModule} from "./SdCheckboxControlModule";

@NgModule({
  imports: [
    CommonModule,
    ApplicationModule,
    SdIconControlModule,
    SdDockControlModule,
    SdDropdownControlModule,
    SdDropdownPopupControlModule,
    SdPaneControlModule,
    SdCheckboxControlModule
  ],
  declarations: [
    SdMultiSelectControl,
    SdMultiSelectItemControl
  ],
  exports: [
    SdMultiSelectControl,
    SdMultiSelectItemControl
  ],
  entryComponents: [],
  providers: []
})
export class SdMultiSelectControlModule {
}