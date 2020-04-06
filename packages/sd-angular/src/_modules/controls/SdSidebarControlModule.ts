import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSidebarControl} from "../../controls/SdSidebarControl";
import {SdSidebarContainerControlModule} from "./SdSidebarContainerControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdSidebarContainerControlModule
  ],
  declarations: [
    SdSidebarControl
  ],
  exports: [
    SdSidebarControl
  ],
  entryComponents: [],
  providers: []
})
export class SdSidebarControlModule {
}