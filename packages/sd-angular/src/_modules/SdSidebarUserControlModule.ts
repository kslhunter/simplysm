import {NgModule} from "@angular/core";
import {SdSidebarUserControl} from "../controls/SdSidebarUserControl";
import {SdCollapseControlModule} from "./SdCollapseControlModule";
import {SdCollapseIconControlModule} from "./SdCollapseIconControlModule";

@NgModule({
  imports: [
    SdCollapseControlModule,
    SdCollapseIconControlModule
  ],
  declarations: [
    SdSidebarUserControl
  ],
  exports: [
    SdSidebarUserControl
  ],
  entryComponents: []
})
export class SdSidebarUserControlModule {
}