import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor";
import { SdDockModule } from "../dock";
import { SdModalModule } from "../modal";
import { SdPaneModule } from "../pane";
import { SdSelectModule } from "../select";
import { SdSharedDataService } from "./sd-shared-data.service";
import { SdTextfieldModule } from "../textfield";
import { SdSharedDataSelectComponent } from "./sd-shared-data-select.component";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdDockModule, SdModalModule, SdPaneModule, SdSelectModule, SdTextfieldModule],
  declarations: [SdSharedDataSelectComponent],
  exports: [SdSharedDataSelectComponent],
  providers: [SdSharedDataService]
})
export class SdSharedDataModule {
}
