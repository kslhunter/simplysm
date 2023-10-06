import { SdDockContainerControl } from "../../controls/SdDockContainerControl";
import { SdDockControl } from "../../controls/SdDockControl";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule],
  declarations: [SdDockContainerControl, SdDockControl],
  exports: [SdDockContainerControl, SdDockControl],
  providers: []
})
export class SdDockContainerControlModule {
}