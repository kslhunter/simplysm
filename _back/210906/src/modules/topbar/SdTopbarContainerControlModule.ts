import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdTopbarContainerControl } from "./SdTopbarContainerControl";
import { SdSidebarContainerControlModule } from "../sidebar/SdSidebarContainerControlModule";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdAnchorControlModule } from "../anchor/SdAnchorControlModule";
import { SdGapControlModule } from "../gap/SdGapControlModule";
import { SdTopbarControl } from "./SdTopbarControl";
import { SdTopbarTabControl } from "./SdTopbarTabControl";
import { SdTopbarMenuControl } from "./SdTopbarMenuControl";

@NgModule({
  imports: [
    CommonModule,
    SdSidebarContainerControlModule,
    SdIconControlModule,
    SdAnchorControlModule,
    SdGapControlModule
  ],
  declarations: [
    SdTopbarContainerControl,
    SdTopbarControl,
    SdTopbarMenuControl,
    SdTopbarTabControl
  ],
  exports: [
    SdTopbarContainerControl,
    SdTopbarControl,
    SdTopbarMenuControl,
    SdTopbarTabControl
  ]
})
export class SdTopbarContainerControlModule {
}
