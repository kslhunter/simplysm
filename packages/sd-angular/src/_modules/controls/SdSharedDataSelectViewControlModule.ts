import { SdSharedDataSelectViewControl } from "../../controls/SdSharedDataSelectViewControl";
import { SdToastProviderModule } from "../providers/SdToastProviderModule";
import { SdBusyContainerControlModule } from "./SdBusyContainerControlModule";
import { SdDockContainerControlModule } from "./SdDockContainerControlModule";
import { SdListControlModule } from "./SdListControlModule";
import { SdListItemControlModule } from "./SdListItemControlModule";
import { SdPaneControlModule } from "./SdPaneControlModule";
import { SdTextfieldControlModule } from "./SdTextfieldControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdBusyContainerControlModule, SdDockContainerControlModule, SdListControlModule, SdListItemControlModule, SdPaneControlModule, SdTextfieldControlModule, SdToastProviderModule],
  declarations: [SdSharedDataSelectViewControl],
  exports: [SdSharedDataSelectViewControl],
  providers: []
})
export class SdSharedDataSelectViewControlModule {
}