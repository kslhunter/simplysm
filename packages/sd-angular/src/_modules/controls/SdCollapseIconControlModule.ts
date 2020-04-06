import {NgModule} from "@angular/core";
import {SdCollapseIconControl} from "../../controls/SdCollapseIconControl";
import {SdIconControlModule} from "./icons/SdIconControlModule";

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
  entryComponents: [],
  providers: []
})
export class SdCollapseIconControlModule {
}