import { SdSidebarControl } from "../../controls/SdSidebarControl";
import { SdSidebarContainerControlModule } from "./SdSidebarContainerControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdSidebarContainerControlModule],
  declarations: [SdSidebarControl],
  exports: [SdSidebarControl],
  providers: []
})
export class SdSidebarControlModule {
}