import {NgModule} from "@angular/core";
import {SdDockControl} from "../../controls/SdDockControl";
import {CommonModule} from "@angular/common";
import {SdDockContainerControl} from "../../controls/SdDockContainerControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdDockControl,
    SdDockContainerControl
  ],
  exports: [
    SdDockControl,
    SdDockContainerControl
  ],
  entryComponents: [],
  providers: []
})
export class SdDockControlModule {
}