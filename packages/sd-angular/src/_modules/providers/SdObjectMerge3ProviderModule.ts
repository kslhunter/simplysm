import { SdObjectMerge3Provider } from "../../providers/SdObjectMerge3Provider";
import { SdObjectMerge3ModalModule } from "../modals/SdObjectMerge3ModalModule";
import { SdModalProviderModule } from "./SdModalProviderModule";
import { SdToastProviderModule } from "./SdToastProviderModule";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [SdModalProviderModule, SdObjectMerge3ModalModule, SdToastProviderModule],
  declarations: [],
  exports: [],
  providers: [SdObjectMerge3Provider]
})
export class SdObjectMerge3ProviderModule {
}