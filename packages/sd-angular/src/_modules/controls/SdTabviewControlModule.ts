import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdTabviewControl} from "../../controls/SdTabviewControl";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdTabControlModule} from "./SdTabControlModule";
import {SdTabItemControlModule} from "./SdTabItemControlModule";
import {SdTabviewItemControl} from "../../controls/SdTabviewItemControl";

@NgModule({
  imports: [
    CommonModule,
    SdDockControlModule,
    SdPaneControlModule,
    SdTabControlModule,
    SdTabItemControlModule
  ],
  declarations: [
    SdTabviewControl,
    SdTabviewItemControl
  ],
  exports: [
    SdTabviewControl,
    SdTabviewItemControl
  ],
  entryComponents: [],
  providers: []
})
export class SdTabviewControlModule {
}