import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdBusyContainerControl } from "./sd-busy-container.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdBusyContainerControl],
  exports: [SdBusyContainerControl],
  providers: []
})
export class SdBusyModule {
}
