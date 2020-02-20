import {NgModule, ApplicationModule} from "@angular/core";
import {SdSelectControl} from "../../controls/SdSelectControl";
import {SdDropdownControlModule} from "./SdDropdownControlModule";
import {CommonModule} from "@angular/common";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdDropdownPopupControlModule} from "./SdDropdownPopupControlModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    SdDropdownControlModule,
    CommonModule,
    SdDockControlModule,
    SdDropdownPopupControlModule,
    SdIconControlModule,
    SdPaneControlModule
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