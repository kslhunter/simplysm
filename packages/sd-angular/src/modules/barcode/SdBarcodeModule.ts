import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdBarcodeControl} from "./SdBarcodeControl";
import {SdSharedModule} from "../shared/SdSharedModule";


@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdBarcodeControl
  ],
  declarations: [
    SdBarcodeControl
  ]
})
export class SdBarcodeModule {
}
