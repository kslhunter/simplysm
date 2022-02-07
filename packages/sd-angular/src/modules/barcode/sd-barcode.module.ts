import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdBarcodeControl } from "./sd-barcode.control";

@NgModule({
  imports: [CommonModule],
  declarations: [SdBarcodeControl],
  exports: [SdBarcodeControl],
  providers: []
})
export class SdBarcodeModule {
}
