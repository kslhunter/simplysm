import {NgModule} from "@angular/core";
import {SdModalEntryControl} from "../../controls/SdModalEntryControl";
import {CommonModule} from "@angular/common";
import {SdIconControlModule} from "./SdIconControlModule";
import {SdPaneControlModule} from "./SdPaneControlModule";
import {SdDockControl} from "../../controls/SdDockControl";
import {SdAngularModule} from "../../SdAngularModule";
import {SdDockContainerControl} from "../../controls/SdDockContainerControl";

@NgModule({
  imports: [
    CommonModule,
    SdIconControlModule,
    SdPaneControlModule,
    SdAngularModule
  ],
  declarations: [
    SdModalEntryControl,
    SdDockControl,
    SdDockContainerControl
  ],
  exports: [
    SdModalEntryControl,
    SdDockControl,
    SdDockContainerControl
  ],
  entryComponents: [
    SdModalEntryControl
  ]
})
export class SdModalEntryControlModule {
}