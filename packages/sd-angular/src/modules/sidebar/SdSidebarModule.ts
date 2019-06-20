import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdDockModule} from "../dock/SdDockModule";
import {SdWindowModule} from "../window/SdWindowModule";
import {SdIconModule} from "../icon/SdIconModule";
import {SdSidebarControl} from "./SdSidebarControl";
import {SdSidebarContainerControl} from "./SdSidebarContainerControl";
import {SdSidebarBrandControl} from "./SdSidebarBrandControl";
import {SdSidebarUserControl} from "./SdSidebarUserControl";
import {SdSidebarUserMenuControl} from "./SdSidebarUserMenuControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdDockModule,
    SdWindowModule,
    SdIconModule
  ],
  exports: [
    SdSidebarControl,
    SdSidebarContainerControl,
    SdSidebarBrandControl,
    SdSidebarUserControl,
    SdSidebarUserMenuControl
  ],
  declarations: [
    SdSidebarControl,
    SdSidebarContainerControl,
    SdSidebarBrandControl,
    SdSidebarUserControl,
    SdSidebarUserMenuControl
  ]
})
export class SdSidebarModule {
}
