import {NgModule} from "@angular/core";
import {../../controls/SdSidebarContainerControl} from "../../controls/SdSidebarContainerControl";
import {RouterModule} from "@angular/router";

@NgModule({
  imports: [
    RouterModule
  ],
  declarations: [
    SdSidebarContainerControl
  ],
  exports: [
    SdSidebarContainerControl
  ],
  entryComponents: []
})
export class SdSidebarContainerControlModule {
}