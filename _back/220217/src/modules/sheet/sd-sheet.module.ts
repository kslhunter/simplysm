import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor/sd-anchor.module";
import { SdButtonModule } from "../button/sd-button.module";
import { SdCardModule } from "../card/sd-card.module";
import { SdCheckboxModule } from "../checkbox/sd-checkbox.module";
import { SdDockModule } from "../dock/sd-dock.module";
import { SdGapModule } from "../gap/sd-gap.module";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdModalModule } from "../modal/sd-modal.module";
import { SdPaginationModule } from "../pagination/sd-pagination.module";
import { SdPaneModule } from "../pane/sd-pane.module";
import { SdResizeModule } from "../resize/sd-resize.module";
import { SdTextfieldModule } from "../textfield/sd-textfield.module";
import { SdSheetControl } from "./sd-sheet.control";
import { SdSheetColumnControl } from "./sd-sheet-column.control";
import { SdSheetCellControl } from "./sd-sheet-cell.control";
import { SdSheetConfigModal } from "./sd-sheet-config.modal";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdButtonModule, SdCardModule, SdCheckboxModule, SdDockModule, SdGapModule, FontAwesomeModule, SdModalModule, SdPaginationModule, SdPaneModule, SdResizeModule, SdTextfieldModule],
  declarations: [SdSheetConfigModal, SdSheetControl, SdSheetColumnControl, SdSheetCellControl],
  exports: [SdSheetConfigModal, SdSheetControl, SdSheetColumnControl, SdSheetCellControl],
  providers: []
})
export class SdSheetModule {
}
