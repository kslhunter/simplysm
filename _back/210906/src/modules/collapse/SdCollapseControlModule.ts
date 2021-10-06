import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdCollapseControl } from "./SdCollapseControl";
import { SdResizeDirectiveModule } from "../resize/SdResizeDirectiveModule";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdCollapseIconControl } from "./SdCollapseIconControl";

@NgModule({
  imports: [
    CommonModule,
    SdResizeDirectiveModule,
    SdIconControlModule
  ],
  declarations: [
    SdCollapseControl,
    SdCollapseIconControl
  ],
  exports: [
    SdCollapseControl,
    SdCollapseIconControl
  ]
})
export class SdCollapseControlModule {
}
