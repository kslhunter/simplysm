import {NgModule} from "@angular/core";
import {SdDockContainerControl} from "../../controls/SdDockContainerControl";
import {SdDockControl} from "../../controls/SdDockControl";
import {CommonModule} from "@angular/common";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdDockContainerControl,
    SdDockControl
  ],
  exports: [
    SdDockContainerControl,
    SdDockControl
  ],
  entryComponents: []
})
export class SdDockContainerControlModule {
}