import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdGapControl } from "./sd-gap.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdGapControl],
  exports: [SdGapControl],
  providers: []
})
export class SdGapModule {
}
