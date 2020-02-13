import {NgModule} from "@angular/core";
import {SdSidebarControl} from "../../controls/SdSidebarControl";
import {SdSidebarContainerControlModule} from "./SdSidebarContainerControlModule";

@NgModule({
  imports: [
    SdSidebarContainerControlModule
  ],
  declarations: [
    SdSidebarControl
  ],
  exports: [
    SdSidebarControl
  ],
  entryComponents: []
})
export class SdSidebarControlModule {
}