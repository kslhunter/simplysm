import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdSidebarContainerControl } from "./SdSidebarContainerControl";
import { RouterModule } from "@angular/router";
import { SdSidebarControl } from "./SdSidebarControl";
import { SdCollapseControlModule } from "../collapse/SdCollapseControlModule";
import { SdSidebarBrandControl } from "./SdSidebarBrandControl";
import { SdSidebarUserControl } from "./SdSidebarUserControl";
import { SdSidebarUserMenuControl } from "./SdSidebarUserMenuControl";

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    SdCollapseControlModule
  ],
  declarations: [
    SdSidebarContainerControl,
    SdSidebarControl,
    SdSidebarBrandControl,
    SdSidebarUserControl,
    SdSidebarUserMenuControl
  ],
  exports: [
    SdSidebarContainerControl,
    SdSidebarControl,
    SdSidebarBrandControl,
    SdSidebarUserControl,
    SdSidebarUserMenuControl
  ]
})
export class SdSidebarContainerControlModule {
}
