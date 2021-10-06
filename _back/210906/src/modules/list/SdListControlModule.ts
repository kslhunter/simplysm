import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdListControl } from "./SdListControl";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdCollapseControlModule } from "../collapse/SdCollapseControlModule";
import { SdListItemControl } from "./SdListItemControl";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
    SdCollapseControlModule
  ],
  declarations: [
    SdListControl,
    SdListItemControl
  ],
  exports: [
    SdListControl,
    SdListItemControl
  ]
})
export class SdListControlModule {
}
