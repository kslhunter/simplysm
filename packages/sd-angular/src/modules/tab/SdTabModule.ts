import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdDockModule} from "../dock/SdDockModule";
import {SdPaneModule} from "../pane/SdPaneModule";
import {SdTabviewControl} from "./SdTabviewControl";
import {SdTabviewItemControl} from "./SdTabviewItemControl";
import {SdTabControl} from "./SdTabControl";
import {SdTabItemControl} from "./SdTabItemControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdDockModule,
    SdPaneModule
  ],
  exports: [
    SdTabviewControl,
    SdTabviewItemControl,
    SdTabControl,
    SdTabItemControl
  ],
  declarations: [
    SdTabviewControl,
    SdTabviewItemControl,
    SdTabControl,
    SdTabItemControl
  ]
})
export class SdTabModule {
}
