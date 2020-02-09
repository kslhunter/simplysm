import {NgModule} from "@angular/core";
import {SdDockContainerControl} from "../controls/SdDockContainerControl";
import {SdDockControlModule} from "./SdDockControlModule";

@NgModule({
  imports: [
    SdDockControlModule
  ],
  declarations: [
    SdDockContainerControl
  ],
  exports: [
    SdDockContainerControl
  ],
  entryComponents: []
})
export class SdDockContainerControlModule {
}