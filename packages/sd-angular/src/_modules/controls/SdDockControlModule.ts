import {NgModule} from "@angular/core";
import {SdDockControl} from "../../controls/SdDockControl";
import {SdAngularModule} from "../../SdAngularModule";
import {CommonModule} from "@angular/common";
import {SdDockContainerControl} from "../../controls/SdDockContainerControl";

@NgModule({
  imports: [
    SdAngularModule,
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
  entryComponents: []
})
export class SdDockControlModule {
}