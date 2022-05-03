import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdProgressControl } from "./sd-progress.control";
import { SdProgressItemControl } from "./sd-progress-item.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdProgressControl, SdProgressItemControl],
  exports: [SdProgressControl, SdProgressItemControl],
  providers: []
})
export class SdProgressModule {
}
