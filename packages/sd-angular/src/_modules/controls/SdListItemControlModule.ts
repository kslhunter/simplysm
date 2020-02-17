import {NgModule} from "@angular/core";
import {SdListItemControl} from "../../controls/SdListItemControl";
import {CommonModule} from "@angular/common";
import {SdListControlModule} from "./SdListControlModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdCollapseControlModule} from "./SdCollapseControlModule";
import {SdCollapseIconControlModule} from "./SdCollapseIconControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdListControlModule,
    SdIconControlModule,
    SdCollapseControlModule,
    SdCollapseIconControlModule
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