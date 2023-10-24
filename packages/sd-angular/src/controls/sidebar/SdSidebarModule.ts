import {SdSidebarControl} from "./SdSidebarControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdSidebarUserControl} from "./SdSidebarUserControl";
import {SdSidebarContainerControl} from "./SdSidebarContainerControl";
import {SdCollapseModule} from "../collapse/SdCollapseModule";
import {SdListModule} from "../list/SdListModule";
import {SdSidebarMenuControl} from "./SdSidebarMenuControl";
import {SdIconControl} from "../SdIconControl";
import {SdTypedTemplateDirective} from "../../directives/SdTypedTemplateDirective";


@NgModule({
    imports: [CommonModule, SdCollapseModule, SdListModule, SdIconControl, SdTypedTemplateDirective],
  declarations: [
    SdSidebarControl,
    SdSidebarUserControl,
    SdSidebarContainerControl,
    SdSidebarMenuControl
  ],
  exports: [
    SdSidebarControl,
    SdSidebarUserControl,
    SdSidebarContainerControl,
    SdSidebarMenuControl
  ],
  providers: []
})
export class SdSidebarModule {
}