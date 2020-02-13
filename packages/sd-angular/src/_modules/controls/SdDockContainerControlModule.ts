import {NgModule} from "@angular/core";
import {SdDockContainerControl} from "../../controls/SdDockContainerControl";
import {SdDockControl} from "../../controls/SdDockControl";

@NgModule({
  imports: [],
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