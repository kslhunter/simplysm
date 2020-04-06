import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdCollapseIconControl} from "../../controls/SdCollapseIconControl";
import {SdIconControlModule} from "./icons/SdIconControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule
  ],
  declarations: [
    SdCollapseIconControl
  ],
  exports: [
    SdCollapseIconControl
  ],
  entryComponents: [],
  providers: []
})
export class SdCollapseIconControlModule {
}