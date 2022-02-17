import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdBusyModule } from "../busy/sd-busy.module";
import { SdToastModule } from "../toast/sd-toast.module";
import { SdLazyViewPage } from "./sd-lazy-view.page";

@NgModule({
  imports: [CommonModule, SdBusyModule, SdToastModule],
  declarations: [SdLazyViewPage],
  exports: [SdLazyViewPage],
  providers: []
})
export class SdLazyViewModule {
}
