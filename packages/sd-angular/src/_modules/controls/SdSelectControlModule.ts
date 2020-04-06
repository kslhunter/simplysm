import {NgModule, ApplicationModule} from "@angular/core";
import {SdSelectControl} from "../../controls/SdSelectControl";
import {SdDropdownControlModule} from "./SdDropdownControlModule";
import {SdIconControlModule} from "./icons/SdIconControlModule";
import {CommonModule} from "@angular/common";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdDropdownPopupControlModule} from "./SdDropdownPopupControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";

@NgModule({
  imports: [
    ApplicationModule,
    SdDropdownControlModule,
    SdIconControlModule,
    CommonModule,
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