import {NgModule, ApplicationModule} from "@angular/core";
import {SdMultiSelectControl} from "../../controls/SdMultiSelectControl";
import {CommonModule} from "@angular/common";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdDropdownControlModule} from "./SdDropdownControlModule";
import {SdDropdownPopupControlModule} from "./SdDropdownPopupControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdModalEntryControlModule} from "./SdModalEntryControlModule";
import {SdMultiSelectItemControl} from "../../controls/SdMultiSelectItemControl";
import {SdCheckboxControlModule} from "./SdCheckboxControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    CommonModule,
    SdIconControlModule,
    SdDropdownControlModule,
    SdDropdownPopupControlModule,
    SdPaneControlModule,
    SdModalEntryControlModule,
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