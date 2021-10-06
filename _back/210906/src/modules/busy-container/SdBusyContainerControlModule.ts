import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdBusyContainerControl } from "./SdBusyContainerControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdBusyContainerControl
  ],
  exports: [
    SdBusyContainerControl
  ]
})
export class SdBusyContainerControlModule {
}
