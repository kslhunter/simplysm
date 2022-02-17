import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor/sd-anchor.module";
import { SdGapModule } from "../gap/sd-gap.module";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdSidebarModule } from "../sidebar/sd-sidebar.module";
import { SdTopbarControl } from "./sd-topbar.control";
import { SdTopbarContainerControl } from "./sd-topbar-container.control";
import { SdTopbarMenuControl } from "./sd-topbar-menu.control";
import { SdTopbarTabControl } from "./sd-topbar-tab.control";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdGapModule, FontAwesomeModule, SdSidebarModule],
  declarations: [SdTopbarControl, SdTopbarContainerControl, SdTopbarMenuControl, SdTopbarTabControl],
  exports: [SdTopbarControl, SdTopbarContainerControl, SdTopbarMenuControl, SdTopbarTabControl],
  providers: []
})
export class SdTopbarModule {
}
