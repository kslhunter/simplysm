import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSidebarUserControl} from "../../controls/SdSidebarUserControl";
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