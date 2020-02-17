import {NgModule} from "@angular/core";
import {SdModalEntryControl} from "../../controls/SdModalEntryControl";
import {CommonModule} from "@angular/common";
import {SdDockControlModule} from "./SdDockControlModule";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";

@NgModule({
  imports: [
    CommonModule,
    SdDockControlModule,
    SdIconControlModule,
    SdPaneControlModule
  ],
  declarations: [
    SdModalEntryControl
  ],
  exports: [
    SdModalEntryControl
  ],
  entryComponents: [
    SdModalEntryControl
  ]
})
export class SdModalEntryControlModule {
}