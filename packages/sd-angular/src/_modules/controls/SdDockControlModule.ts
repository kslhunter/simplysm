import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdDockControl} from "../../controls/SdDockControl";
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