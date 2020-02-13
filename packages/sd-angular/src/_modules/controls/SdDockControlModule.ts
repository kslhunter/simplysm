import {NgModule} from "@angular/core";
import {SdDockControl} from "../../controls/SdDockControl";
import {SdDockContainerControl} from "../../controls/SdDockContainerControl";

@NgModule({
  imports: [],
  declarations: [
    SdDockControl,
    SdDockContainerControl
  ],
  exports: [
    SdDockControl,
    SdDockContainerControl
  ],
  entryComponents: []
})
export class SdDockControlModule {
}