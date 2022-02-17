import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdLabelControl } from "./sd-label.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdLabelControl],
  exports: [SdLabelControl],
  providers: []
})
export class SdLabelModule {
}
