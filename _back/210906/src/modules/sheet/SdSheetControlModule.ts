import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SdSheetControl } from "./SdSheetControl";
import { SdIconControlModule } from "../icon/SdIconControlModule";
import { SdAnchorControlModule } from "../anchor/SdAnchorControlModule";
import { SdCardControlModule } from "../card/SdCardControlModule";
import { SdCheckboxControlModule } from "../checkbox/SdCheckboxControlModule";
import { SdDockContainerControlModule } from "../dock/SdDockContainerControlModule";
import { SdGapControlModule } from "../gap/SdGapControlModule";
import { SdPaginationControlModule } from "../pagination/SdPaginationControlModule";
import { SdPaneControlModule } from "../pane/SdPaneControlModule";
import { SdResizeDirectiveModule } from "../resize/SdResizeDirectiveModule";
import { SdSheetConfigModal } from "./SdSheetConfigModal";
import { SdButtonControlModule } from "../button/SdButtonControlModule";
import { SdTextfieldControlModule } from "../textfield/SdTextfieldControlModule";
import { SdSheetCellControl } from "./SdSheetCellControl";
import { SdSheetColumnControl } from "./SdSheetColumnControl";
import { SdModalModule } from "../modal/SdModalModule";

@NgModule({
  imports: [
    CommonModule,
    SdModalModule,
    SdIconControlModule,
    SdAnchorControlModule,
    SdCardControlModule,
    SdCheckboxControlModule,
    SdDockContainerControlModule,
    SdGapControlModule,
    SdPaginationControlModule,
    SdPaneControlModule,
    SdResizeDirectiveModule,
    SdButtonControlModule,
    SdTextfieldControlModule
  ],
  declarations: [
    SdSheetControl,
    SdSheetConfigModal,
    SdSheetCellControl,
    SdSheetColumnControl
  ],
  exports: [
    SdSheetControl,
    SdSheetConfigModal,
    SdSheetCellControl,
    SdSheetColumnControl
  ]
})
export class SdSheetControlModule {
}
