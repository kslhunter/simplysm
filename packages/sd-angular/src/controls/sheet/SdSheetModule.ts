import {SdSheetControl} from "./SdSheetControl";
import {SdSheetConfigModal} from "./SdSheetConfigModal";
import {CommonModule} from "@angular/common";
import {NgModule} from "@angular/core";
import {SdSheetColumnControl} from "./SdSheetColumnControl";
import {SdDockingModule} from "../dock/SdDockingModule";
import {SdPaneControl} from "../SdPaneControl";
import {SdCheckboxModule} from "../checkbox/SdCheckboxModule";
import {SdAnchorControl} from "../SdAnchorControl";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {SdTextfieldControl} from "../SdTextfieldControl";
import {SdButtonControl} from "../SdButtonControl";
import {SdBusyContainerControl} from "../SdBusyContainerControl";
import {SdPaginationControl} from "../SdPaginationControl";
import {SdResizeOutsideDirective} from "../../directives/SdResizeOutsideDirective";

@NgModule({
  imports: [CommonModule, SdDockingModule, SdPaneControl, SdCheckboxModule, SdAnchorControl, FontAwesomeModule, SdTextfieldControl, SdButtonControl, SdBusyContainerControl, SdPaginationControl, SdResizeOutsideDirective],
  declarations: [SdSheetConfigModal, SdSheetControl, SdSheetColumnControl],
  exports: [SdSheetConfigModal, SdSheetControl, SdSheetColumnControl],
  providers: []
})
export class SdSheetModule {
}