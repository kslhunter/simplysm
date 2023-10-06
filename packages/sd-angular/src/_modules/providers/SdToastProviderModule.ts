import { SdToastProvider } from "../../providers/SdToastProvider";
import { SdToastContainerControlModule } from "../controls/SdToastContainerControlModule";
import { SdToastControlModule } from "../controls/SdToastControlModule";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [SdToastContainerControlModule, SdToastControlModule],
  declarations: [],
  exports: [],
  providers: [SdToastProvider]
})
export class SdToastProviderModule {
}