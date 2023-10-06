import { SdSidebarUserControl } from "../../controls/SdSidebarUserControl";
import { SdCollapseControlModule } from "./SdCollapseControlModule";
import { SdCollapseIconControlModule } from "./SdCollapseIconControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdCollapseControlModule, SdCollapseIconControlModule],
  declarations: [SdSidebarUserControl],
  exports: [SdSidebarUserControl],
  providers: []
})
export class SdSidebarUserControlModule {
}