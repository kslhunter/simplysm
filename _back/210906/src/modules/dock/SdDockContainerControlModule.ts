import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdDockContainerControl,
    SdDockControl
  ],
  exports: [
    SdDockContainerControl,
    SdDockControl
  ]
})
export class SdDockContainerControlModule {
}
