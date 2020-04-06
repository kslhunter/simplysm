import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSidebarContainerControl} from "../../controls/SdSidebarContainerControl";
import {RouterModule} from "@angular/router";

@NgModule({
  imports: [
    CommonModule,
    RouterModule
  ],
  declarations: [
    SdSidebarContainerControl
  ],
  exports: [
    SdSidebarContainerControl
  ],
  entryComponents: [],
  providers: []
})
export class SdSidebarContainerControlModule {
}