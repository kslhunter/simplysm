import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdListItemControl} from "../../controls/SdListItemControl";
import {SdListControlModule} from "./SdListControlModule";
import {SdIconControlModule} from "./icons/SdIconControlModule";
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
  entryComponents: [],
  providers: []
})
export class SdListItemControlModule {
}