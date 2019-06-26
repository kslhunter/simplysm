import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdSharedModule} from "../shared/SdSharedModule";
import {SdLocalStorageModule} from "../local-storage/SdLocalStorageModule";
import {SdDockControl} from "./SdDockControl";
import {SdDockContainerControl} from "./SdDockContainerControl";

@NgModule({
  imports: [
    CommonModule,
    SdSharedModule,
    SdLocalStorageModule
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
