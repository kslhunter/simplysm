import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdBarcodeControl} from "../../controls/SdBarcodeControl";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SdBarcodeControl
  ],
  exports: [
    SdBarcodeControl
  ],
  entryComponents: [],
  providers: []
})
export class SdBarcodeControlModule {
}