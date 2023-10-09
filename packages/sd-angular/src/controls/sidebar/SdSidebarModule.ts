import {SdSidebarControl} from "./SdSidebarControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdSidebarUserMenuControl} from "./SdSidebarUserMenuControl";
import {SdSidebarUserControl} from "./SdSidebarUserControl";
import {SdSidebarContainerControl} from "./SdSidebarContainerControl";
import {SdSidebarBrandControl} from "./SdSidebarBrandControl";
import {SdCollapseModule} from "../collapse/SdCollapseModule";

@NgModule({
  imports: [CommonModule, SdCollapseModule],
  declarations: [
    SdSidebarControl,
    SdSidebarUserMenuControl,
    SdSidebarUserControl,
    SdSidebarContainerControl,
    SdSidebarBrandControl
  ],
  exports: [
    SdSidebarControl,
    SdSidebarUserMenuControl,
    SdSidebarUserControl,
    SdSidebarContainerControl,
    SdSidebarBrandControl
  ],
  providers: []
})
export class SdSidebarModule {
}