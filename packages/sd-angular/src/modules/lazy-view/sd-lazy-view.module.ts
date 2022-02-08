import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdBusyModule } from "../busy";
import { SdToastModule } from "../toast";
import { SdLazyViewPage } from "./sd-lazy-view.page";

@NgModule({
  imports: [CommonModule, SdBusyModule, SdToastModule],
  declarations: [SdLazyViewPage],
  exports: [SdLazyViewPage],
  providers: []
})
export class SdLazyViewModule {
}
