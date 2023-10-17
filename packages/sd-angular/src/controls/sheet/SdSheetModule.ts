import {SdSheetControl} from "./SdSheetControl";
import {SdSheetConfigModal} from "./SdSheetConfigModal";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdSheetColumnDirective} from "./SdSheetColumnDirective";
import {SdDockingModule} from "../dock/SdDockingModule";
import {SdPaneControl} from "../SdPaneControl";
import {SdCheckboxModule} from "../checkbox/SdCheckboxModule";
import {SdAnchorControl} from "../SdAnchorControl";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {SdTextfieldControl} from "../SdTextfieldControl";
import {SdButtonControl} from "../SdButtonControl";
import {SdBusyContainerControl} from "../SdBusyContainerControl";
import {SdPaginationControl} from "../SdPaginationControl";
import {SdResizeDirective} from "../../directives/SdResizeDirective";
import {SdSheetColumnCellTemplateDirective} from "./SdSheetColumnCellTemplateDirective";

@NgModule({
  imports: [CommonModule, SdDockingModule, SdPaneControl, SdCheckboxModule, SdAnchorControl, FontAwesomeModule, SdTextfieldControl, SdButtonControl, SdBusyContainerControl, SdPaginationControl, SdResizeDirective],
  declarations: [SdSheetConfigModal, SdSheetControl, SdSheetColumnDirective, SdSheetColumnCellTemplateDirective],
  exports: [SdSheetConfigModal, SdSheetControl, SdSheetColumnDirective, SdSheetColumnCellTemplateDirective],
  providers: []
})
export class SdSheetModule {
}