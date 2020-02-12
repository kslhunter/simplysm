import {NgModule} from "@angular/core";
import {../../controls/SdTopbarControl} from "../../controls/SdTopbarControl";
import {SdSidebarContainerControlModule} from "./SdSidebarContainerControlModule";
import {SdIconControlModule} from "./SdIconControlModule";

@NgModule({
  imports: [
    SdSidebarContainerControlModule,
    SdIconControlModule
  ],
  declarations: [
    SdTopbarControl
  ],
  exports: [
    SdTopbarControl
  ],
  entryComponents: []
})
export class SdTopbarControlModule {
}