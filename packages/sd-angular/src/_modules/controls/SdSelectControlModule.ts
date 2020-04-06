import {NgModule, ApplicationModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSelectControl} from "../../controls/SdSelectControl";
import {SdDropdownControlModule} from "./SdDropdownControlModule";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdDropdownPopupControlModule} from "./SdDropdownPopupControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";

@NgModule({
  imports: [
    CommonModule,
    ApplicationModule,
    SdDropdownControlModule,
    SdIconControlModule,
    SdDockControlModule,
    SdDropdownPopupControlModule,
    SdPaneControlModule
  ],
  declarations: [
    SdSelectControl
  ],
  exports: [
    SdSelectControl
  ],
  entryComponents: [],
  providers: []
})
export class SdSelectControlModule {
}