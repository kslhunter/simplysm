import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdTextfieldControl } from "./sd-textfield.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdTextfieldControl],
  exports: [SdTextfieldControl],
  providers: []
})
export class SdTextfieldModule {
}
