import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdBusyModule } from "../busy";
import { SdToastModule } from "../toast";
import { SdLazyViewControl } from "./sd-lazy-view.control";

@NgModule({
  imports: [CommonModule, SdBusyModule, SdToastModule],
  declarations: [SdLazyViewControl],
  exports: [SdLazyViewControl],
  providers: []
})
export class SdLazyViewModule {
}
