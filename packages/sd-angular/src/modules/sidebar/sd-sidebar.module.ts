import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { SdCollapseModule } from "../collapse/sd-collapse.module";
import { SdCollapseIconModule } from "../collapse-icon/sd-collapse-icon.module";
import { SdSidebarControl } from "./sd-sidebar.control";
import { SdSidebarBrandControl } from "./sd-sidebar-brand.control";
import { SdSidebarContainerControl } from "./sd-sidebar-container.control";
import { SdSidebarUserControl } from "./sd-sidebar-user.control";
import { SdSidebarUserMenuControl } from "./sd-sidebar-user-menu.control";

@NgModule({
  imports: [CommonModule, RouterModule, SdCollapseModule, SdCollapseIconModule],
  declarations: [SdSidebarControl, SdSidebarBrandControl, SdSidebarContainerControl, SdSidebarUserControl, SdSidebarUserMenuControl],
  exports: [SdSidebarControl, SdSidebarBrandControl, SdSidebarContainerControl, SdSidebarUserControl, SdSidebarUserMenuControl],
  providers: []
})
export class SdSidebarModule {
}
