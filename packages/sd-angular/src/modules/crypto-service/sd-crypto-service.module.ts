import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdCryptoServiceProvider } from "./sd-crypto-service.provider";

@NgModule({
  imports: [CommonModule],
  declarations: [],
  exports: [],
  providers: [SdCryptoServiceProvider]
})
export class SdCryptoServiceModule {
}
