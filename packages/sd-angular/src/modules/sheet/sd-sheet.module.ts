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
import { SdSheetComponent } from "./sd-sheet.component";
import { SdSheetColumnComponent } from "./sd-sheet-column.component";
import { SdSheetCellComponent } from "./sd-sheet-cell.component";
import { SdSheetConfigModalComponent } from "./sd-sheet-config-modal.component";

@NgModule({
  imports: [CommonModule, SdAnchorModule, SdButtonModule, SdCardModule, SdCheckboxModule, SdDockModule, SdGapModule, FontAwesomeModule, SdModalModule, SdPaginationModule, SdPaneModule, SdResizeModule, SdTextfieldModule],
  declarations: [SdSheetConfigModalComponent, SdSheetComponent, SdSheetColumnComponent, SdSheetCellComponent],
  exports: [SdSheetConfigModalComponent, SdSheetComponent, SdSheetColumnComponent, SdSheetCellComponent],
  providers: []
})
export class SdSheetModule {
}
