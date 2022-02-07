import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdButtonControl } from "./sd-button.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdButtonControl],
  exports: [SdButtonControl],
  providers: []
})
export class SdButtonModule {
}
