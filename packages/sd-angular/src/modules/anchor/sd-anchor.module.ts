import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorComponent } from "./sd-anchor.component";

@NgModule({
  imports: [CommonModule],
  declarations: [SdAnchorComponent],
  exports: [SdAnchorComponent],
  providers: []
})
export class SdAnchorModule {
}
