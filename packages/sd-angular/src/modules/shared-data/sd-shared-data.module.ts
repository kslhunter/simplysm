import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor/sd-anchor.module";
import { SdDockModule } from "../dock/sd-dock.module";
import { SdModalModule } from "../modal/sd-modal.module";
import { SdPaneModule } from "../pane/sd-pane.module";
import { SdSelectModule } from "../select/sd-select.module";
import { SdSharedDataProvider } from "./sd-shared-data.provider";
import { SdTextfieldModule } from "../textfield/sd-textfield.module";
import { SdSharedDataSelectControl } from "./sd-shared-data-select.control";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdDockModule, SdModalModule, SdPaneModule, SdSelectModule, SdTextfieldModule],
  declarations: [SdSharedDataSelectControl],
  exports: [SdSharedDataSelectControl],
  providers: [SdSharedDataProvider]
})
export class SdSharedDataModule {
}
