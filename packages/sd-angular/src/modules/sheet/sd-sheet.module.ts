import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { SdAnchorModule } from "../anchor";
import { SdButtonModule } from "../button";
import { SdCardModule } from "../card";
import { SdCheckboxModule } from "../checkbox";
import { SdDockModule } from "../dock";
import { SdGapModule } from "../gap";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { SdModalModule } from "../modal";
import { SdPaginationModule } from "../pagination";
import { SdPaneModule } from "../pane";
import { SdResizeModule } from "../resize";
import { SdTextfieldModule } from "../textfield";
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
