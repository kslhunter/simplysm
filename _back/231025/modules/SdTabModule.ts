import {SdTabControl} from "./SdTabControl";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdTabviewControl} from "./SdTabviewControl";
import {SdTabviewItemControl} from "./SdTabviewItemControl";
import {SdViewControl} from "./SdViewControl";
import {SdViewItemControl} from "./SdViewItemControl";
import {SdTabItemControl} from "./SdTabItemControl";
import {SdDockingModule} from "../dock/SdDockingModule";
import {SdPaneControl} from "../SdPaneControl";

@NgModule({
  imports: [CommonModule, SdDockingModule, SdPaneControl],
  declarations: [
    SdTabviewControl,
    SdTabviewItemControl,
    SdViewControl,
    SdViewItemControl,
    SdTabItemControl,
    SdTabControl
  ],
  exports: [
    SdTabviewControl,
    SdTabviewItemControl,
    SdViewControl,
    SdViewItemControl,
    SdTabItemControl,
    SdTabControl
  ],
  providers: []
})
export class SdTabModule {
}