import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdDockControl } from "./sd-dock.control";
import { SdDockContainerControl } from "./sd-dock-container.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdDockContainerControl, SdDockControl],
  exports: [SdDockContainerControl, SdDockControl],
  providers: []
})
export class SdDockModule {
}
