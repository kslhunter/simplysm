import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {SdAddressSearchModal} from "./SdAddressSearchModal";
import {SdSharedModule} from "../shared/SdSharedModule";


@NgModule({
  imports: [
    CommonModule,
    SdSharedModule
  ],
  exports: [
    SdAddressSearchModal
  ],
  declarations: [
    SdAddressSearchModal
  ],
  entryComponents: [
    SdAddressSearchModal
  ]
})
export class SdAddressSearchModule {
}
