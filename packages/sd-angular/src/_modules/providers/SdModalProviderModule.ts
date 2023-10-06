import { SdModalProvider } from "../../providers/SdModalProvider";
import { SdModalControlModule } from "../controls/SdModalControlModule";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [SdModalControlModule],
  declarations: [],
  exports: [],
  providers: [SdModalProvider]
})
export class SdModalProviderModule {
}