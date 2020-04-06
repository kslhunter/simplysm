import {NgModule} from "@angular/core";
import {SdTabviewControl} from "../../controls/SdTabviewControl";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdTabControlModule} from "./SdTabControlModule";
import {SdTabItemControlModule} from "./SdTabItemControlModule";
import {SdTabviewItemControl} from "../../controls/SdTabviewItemControl";

@NgModule({
  imports: [
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