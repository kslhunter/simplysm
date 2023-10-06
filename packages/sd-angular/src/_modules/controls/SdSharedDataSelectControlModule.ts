import { SdSharedDataSelectControl } from "../../controls/SdSharedDataSelectControl";
import { SdModalProviderModule } from "../providers/SdModalProviderModule";
import { SdAnchorControlModule } from "./SdAnchorControlModule";
import { SdDockContainerControlModule } from "./SdDockContainerControlModule";
import { SdPaneControlModule } from "./SdPaneControlModule";
import { SdSelectControlModule } from "./SdSelectControlModule";
import { SdTextfieldControlModule } from "./SdTextfieldControlModule";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

@NgModule({
  imports: [CommonModule, SdAnchorControlModule, SdDockContainerControlModule, SdModalProviderModule, SdPaneControlModule, SdSelectControlModule, SdTextfieldControlModule],
  declarations: [SdSharedDataSelectControl],
  exports: [SdSharedDataSelectControl],
  providers: []
})
export class SdSharedDataSelectControlModule {
}