import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdDockControl} from "./SdDockControl";
import {SdDockContainerControl} from "./SdDockContainerControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdDockControl,
    SdDockContainerControl
  ],
  declarations: [
    SdDockControl,
    SdDockContainerControl
  ]
})
export class SdDockModule {
}
