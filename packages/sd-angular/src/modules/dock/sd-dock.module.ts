import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdDockComponent } from "./sd-dock.component";
import { SdDockContainerComponent } from "./sd-dock-container.component";

@NgModule({
  imports: [CommonModule],
  declarations: [SdDockContainerComponent, SdDockComponent],
  exports: [SdDockContainerComponent, SdDockComponent],
  providers: []
})
export class SdDockModule {
}
