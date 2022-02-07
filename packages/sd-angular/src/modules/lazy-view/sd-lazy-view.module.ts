import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdBusyContainerModule } from "../busy-container";
import { SdToastModule } from "../toast";
import { SdLazyViewComponent } from "./sd-lazy-view.component";

@NgModule({
  imports: [CommonModule, SdBusyContainerModule, SdToastModule],
  declarations: [SdLazyViewComponent],
  exports: [SdLazyViewComponent],
  providers: []
})
export class SdLazyViewModule {
}
