import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdBusyContainerComponent } from "./sd-busy-container.component";

@NgModule({
  imports: [CommonModule],
  declarations: [SdBusyContainerComponent],
  exports: [SdBusyContainerComponent],
  providers: []
})
export class SdBusyContainerModule {
}
