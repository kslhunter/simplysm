import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdIconModule} from "../icon/SdIconModule";
import {SdSidebarModule} from "../sidebar/SdSidebarModule";
import {SdTopbarControl} from "./SdTopbarControl";
import {SdTopbarContainerControl} from "./SdTopbarContainerControl";
import {SdTopbarMenuControl} from "./SdTopbarMenuControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdIconModule,
    SdSidebarModule
  ],
  exports: [
    SdTopbarControl,
    SdTopbarContainerControl,
    SdTopbarMenuControl
  ],
  declarations: [
    SdTopbarControl,
    SdTopbarContainerControl,
    SdTopbarMenuControl
  ]
})
export class SdTopbarModule {
}
