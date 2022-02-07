import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorControl } from "./sd-anchor.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdAnchorControl],
  exports: [SdAnchorControl],
  providers: []
})
export class SdAnchorModule {
}
