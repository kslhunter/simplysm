import {NgModule} from "@angular/core";
import {SdModalEntryControl} from "../../controls/SdModalEntryControl";
import {CommonModule} from "@angular/common";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdDockContainerControl} from "../../controls/SdDockContainerControl";
import {SdDockControl} from "../../controls/SdDockControl";
import {SdAngularModule} from "../../SdAngularModule";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
    SdPaneControlModule,
    SdAngularModule
  ],
  declarations: [
    SdModalEntryControl,
    SdDockContainerControl,
    SdDockControl
  ],
  exports: [
    SdModalEntryControl,
    SdDockContainerControl,
    SdDockControl
  ],
  entryComponents: [
    SdModalEntryControl
  ]
})
export class SdModalEntryControlModule {
}