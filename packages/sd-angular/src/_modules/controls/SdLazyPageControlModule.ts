import { SdLazyPageControl } from "../../controls/SdLazyPageControl";
import { SdToastProviderModule } from "../providers/SdToastProviderModule";
import { SdBusyContainerControlModule } from "./SdBusyContainerControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdBusyContainerControlModule, SdToastProviderModule],
  declarations: [SdLazyPageControl],
  exports: [SdLazyPageControl],
  providers: []
})
export class SdLazyPageControlModule {
}