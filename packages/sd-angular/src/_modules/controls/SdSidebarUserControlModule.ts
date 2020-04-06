import {NgModule} from "@angular/core";
import {SdSidebarUserControl} from "../../controls/SdSidebarUserControl";
import {CommonModule} from "@angular/common";
import {SdCollapseControlModule} from "./SdCollapseControlModule";
import {SdCollapseIconControlModule} from "./SdCollapseIconControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdCollapseControlModule,
    SdCollapseIconControlModule
  ],
  declarations: [
    SdSidebarUserControl
  ],
  exports: [
    SdSidebarUserControl
  ],
  entryComponents: [],
  providers: []
})
export class SdSidebarUserControlModule {
}