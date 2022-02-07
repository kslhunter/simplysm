import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdBarcodeComponent } from "./sd-barcode.component";

@NgModule({
  imports: [CommonModule],
  declarations: [SdBarcodeComponent],
  exports: [SdBarcodeComponent],
  providers: []
})
export class SdBarcodeModule {
}
