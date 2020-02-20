import {NgModule, ApplicationModule} from "@angular/core";
import {SdMultiSelectControl} from "../../controls/SdMultiSelectControl";
import {CommonModule} from "@angular/common";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdDropdownControlModule} from "./SdDropdownControlModule";
import {SdDropdownPopupControlModule} from "./SdDropdownPopupControlModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdMultiSelectItemControl} from "../../controls/SdMultiSelectItemControl";
import {SdCheckboxControlModule} from "./SdCheckboxControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    CommonModule,
    SdDockControlModule,
    SdDropdownControlModule,
    SdDropdownPopupControlModule,
    SdIconControlModule,
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
  entryComponents: []
})
export class SdMultiSelectControlModule {
}