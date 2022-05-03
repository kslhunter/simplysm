import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAddressSearchModal } from "./sd-address-search.modal";

@NgModule({
  imports: [CommonModule],
  declarations: [SdAddressSearchModal],
  exports: [SdAddressSearchModal],
  providers: []
})
export class SdAddressSearchModule {
}
