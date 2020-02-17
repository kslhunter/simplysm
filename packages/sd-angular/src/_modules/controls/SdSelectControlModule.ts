import {NgModule, ApplicationModule} from "@angular/core";
import {SdSelectControl} from "../../controls/SdSelectControl";
import {SdDropdownControlModule} from "./SdDropdownControlModule";
import {CommonModule} from "@angular/common";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdDropdownPopupControlModule} from "./SdDropdownPopupControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdModalEntryControlModule} from "./SdModalEntryControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    SdDropdownControlModule,
    CommonModule,
    SdIconControlModule,
    SdDropdownPopupControlModule,
    SdPaneControlModule,
    SdModalEntryControlModule
  ],
  declarations: [
    SdSelectControl
  ],
  exports: [
    SdSelectControl
  ],
  entryComponents: []
})
export class SdSelectControlModule {
}