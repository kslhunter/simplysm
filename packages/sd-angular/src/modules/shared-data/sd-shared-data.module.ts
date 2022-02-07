import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor";
import { SdDockModule } from "../dock";
import { SdModalModule } from "../modal";
import { SdPaneModule } from "../pane";
import { SdSelectModule } from "../select";
import { SdSharedDataProvider } from "./sd-shared-data.provider";
import { SdTextfieldModule } from "../textfield";
import { SdSharedDataSelectControl } from "./sd-shared-data-select.control";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdDockModule, SdModalModule, SdPaneModule, SdSelectModule, SdTextfieldModule],
  declarations: [SdSharedDataSelectControl],
  exports: [SdSharedDataSelectControl],
  providers: [SdSharedDataProvider]
})
export class SdSharedDataModule {
}
