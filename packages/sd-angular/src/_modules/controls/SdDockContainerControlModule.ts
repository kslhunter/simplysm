import {NgModule} from "@angular/core";
import {../../controls/SdDockContainerControl} from "../../controls/SdDockContainerControl";
import {../../controls/SdDockControl} from "../../controls/SdDockControl";

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