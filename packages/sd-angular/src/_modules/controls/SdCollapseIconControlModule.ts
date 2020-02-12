import {NgModule} from "@angular/core";
import {../../controls/SdCollapseIconControl} from "../../controls/SdCollapseIconControl";
import {SdIconControlModule} from "./SdIconControlModule";

@NgModule({
  imports: [
    SdIconControlModule
  ],
  declarations: [
    SdCollapseIconControl
  ],
  exports: [
    SdCollapseIconControl
  ],
  entryComponents: []
})
export class SdCollapseIconControlModule {
}