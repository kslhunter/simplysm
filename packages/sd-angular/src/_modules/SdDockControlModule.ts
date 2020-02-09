import {NgModule} from "@angular/core";
import {SdDockControl} from "../controls/SdDockControl";
import {SdDockContainerControlModule} from "./SdDockContainerControlModule";
import {SdAngularModule} from "../SdAngularModule";

@NgModule({
  imports: [
    SdDockContainerControlModule,
    SdAngularModule
  ],
  declarations: [
    SdDockControl
  ],
  exports: [
    SdDockControl
  ],
  entryComponents: []
})
export class SdDockControlModule {
}