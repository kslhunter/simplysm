import {NgModule} from "@angular/core";
import {SdTabviewControl} from "../../controls/SdTabviewControl";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdTabControlModule} from "./SdTabControlModule";
import {SdTabItemControlModule} from "./SdTabItemControlModule";
import {SdModalEntryControlModule} from "./SdModalEntryControlModule";
import {SdTabviewItemControl} from "../../controls/SdTabviewItemControl";

@NgModule({
  imports: [
    SdPaneControlModule,
    SdTabControlModule,
    SdTabItemControlModule,
    SdModalEntryControlModule
  ],
  declarations: [
    SdTabviewControl,
    SdTabviewItemControl
  ],
  exports: [
    SdTabviewControl,
    SdTabviewItemControl
  ],
  entryComponents: []
})
export class SdTabviewControlModule {
}