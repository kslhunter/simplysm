import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdBarcodeControl } from "./SdBarcodeControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdBarcodeControl
  ],
  exports: [
    SdBarcodeControl
  ]
})
export class SdBarcodeControlModule {
}
