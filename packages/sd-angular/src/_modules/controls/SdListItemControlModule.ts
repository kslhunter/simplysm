import {NgModule} from "@angular/core";
import {SdListItemControl} from "../../controls/SdListItemControl";
import {CommonModule} from "@angular/common";
import {SdListControlModule} from "./SdListControlModule";
import {SdCollapseControlModule} from "./SdCollapseControlModule";
import {SdCollapseIconControlModule} from "./SdCollapseIconControlModule";
import {SdIconControlModule} from "./SdIconControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdListControlModule,
    CommonModule,
    SdCollapseControlModule,
    SdCollapseIconControlModule,
    SdIconControlModule
  ],
  declarations: [
    SdListItemControl
  ],
  exports: [
    SdListItemControl
  ],
  entryComponents: []
})
export class SdListItemControlModule {
}