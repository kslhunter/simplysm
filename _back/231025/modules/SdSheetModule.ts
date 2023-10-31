import {SdSheetControl} from "./SdSheetControl";
import {SdSheetConfigModal} from "./SdSheetConfigModal";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdSheetColumnDirective} from "./SdSheetColumnDirective";
import {SdDockingModule} from "../dock/SdDockingModule";
import {SdPaneControl} from "../SdPaneControl";
import {SdCheckboxModule} from "../checkbox/SdCheckboxModule";
import {SdAnchorControl} from "../SdAnchorControl";

import {SdTextfieldControl} from "../SdTextfieldControl";
import {SdButtonControl} from "../SdButtonControl";
import {SdBusyContainerControl} from "../SdBusyContainerControl";
import {SdPaginationControl} from "../SdPaginationControl";
import {SdSheetColumnCellTemplateDirective} from "./SdSheetColumnCellTemplateDirective";
import {SdIconControl} from "../SdIconControl";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {SdEventDirectiveModule} from "../../directives/SdEventDirectiveModule";

@NgModule({
  imports: [CommonModule, SdDockingModule, SdPaneControl, SdCheckboxModule, SdAnchorControl, SdTextfieldControl, SdButtonControl, SdBusyContainerControl, SdPaginationControl, SdIconControl, FontAwesomeModule, SdEventDirectiveModule],
  declarations: [SdSheetConfigModal, SdSheetControl, SdSheetColumnDirective, SdSheetColumnCellTemplateDirective],
  exports: [SdSheetConfigModal, SdSheetControl, SdSheetColumnDirective, SdSheetColumnCellTemplateDirective],
  providers: []
})
export class SdSheetModule {
}